import { Injectable, inject } from '@angular/core';
import { Parser, Store } from 'n3';
import SHACLValidator from 'rdf-validate-shacl';
import type { Quad, Term } from '@rdfjs/types';
import { keyOfPath } from './rdf';
import { ShapeClientService } from './shape-client.service';
import { extractSchema } from './shape-schema';
import { buildDataGraph } from './value-to-graph';
import type { ChildConfig, KeyConstraint, ShapeSchema, ShapeViolation } from './shape.model';

interface ValidationReportResult {
  focusNode?: Term;
  path?: Term | Term[];
  message?: Term[] | Term;
  severity?: Term;
  detail?: ValidationReportResult[];
}

interface LoadedShapes {
  dataset: Store;
  schemaByKey: Map<string, ShapeSchema>;
}

/**
 * ShaclValidatorService — runs the frontend shapes against form values in
 * the browser, mirroring the backend's judgment before the request is sent.
 *
 * Shapes are fetched at runtime from the Program (single source of truth),
 * parsed with N3, and executed with rdf-validate-shacl — full SHACL
 * fidelity, no constraint subset.
 */
@Injectable({ providedIn: 'root' })
export class ShaclValidatorService {
  private readonly client = inject(ShapeClientService);

  /** Fetches and extracts the UI schema of one shape. */
  async loadSchema(shapeKey: string): Promise<ShapeSchema> {
    const loaded = await this.loadShapes([shapeKey]);
    const schema = loaded.schemaByKey.get(shapeKey);
    if (!schema) throw new Error(`No schema was extracted for shape '${shapeKey}'.`);
    return schema;
  }

  /** Validates one entity value against its shape. Empty array = conforms. */
  async validate(shapeKey: string, value: Record<string, unknown>): Promise<ShapeViolation[]> {
    const loaded = await this.loadShapes([shapeKey]);
    const schema = loaded.schemaByKey.get(shapeKey);
    if (!schema) throw new Error(`No schema was extracted for shape '${shapeKey}'.`);
    const rootType = schema.targetClasses[0];
    if (!rootType) throw new Error(`Shape '${shapeKey}' declares no sh:targetClass.`);
    return this.runValidation(loaded, rootType, value, []);
  }

  /**
   * Validates a composite — one parent value plus nested child values — as
   * a single graph. Parent and child shapes load together so `sh:node`
   * references resolve; the engine judges the whole tree in one pass.
   */
  async validateComposite(
    parentShapeKey: string,
    parentValue: Record<string, unknown>,
    child: { shapeKey: string; config: ChildConfig; values: Record<string, unknown>[] },
  ): Promise<ShapeViolation[]> {
    const loaded = await this.loadShapes([parentShapeKey, child.shapeKey]);
    const parentSchema = loaded.schemaByKey.get(parentShapeKey);
    const childSchema = loaded.schemaByKey.get(child.shapeKey);
    if (!parentSchema || !childSchema) {
      throw new Error('Parent and child shapes must both resolve for composite validation.');
    }
    const parentType = parentSchema.targetClasses[0];
    if (!parentType) throw new Error(`Shape '${parentShapeKey}' declares no sh:targetClass.`);
    return this.runValidation(loaded, parentType, parentValue, [
      {
        key: child.config.key,
        type: child.config.type ?? childSchema.targetClasses[0] ?? '',
        values: child.values,
      },
    ]);
  }

  /** Fetches and parses the given shapes into one dataset with schemas. */
  private async loadShapes(shapeKeys: string[]): Promise<LoadedShapes> {
    const entries = await Promise.all(
      shapeKeys.map(async (key) => ({ key, ttl: await this.client.getShapeTtl(key) })),
    );

    const dataset = new Store();
    const parser = new Parser({ format: 'text/turtle' });
    for (const entry of entries) {
      dataset.addQuads(parser.parse(entry.ttl));
    }

    const schemaByKey = new Map<string, ShapeSchema>();
    for (const entry of entries) {
      const shapeIri = findShapeIri(parser.parse(entry.ttl));
      schemaByKey.set(entry.key, extractSchema(dataset, shapeIri));
    }

    return { dataset, schemaByKey };
  }

  /** Builds the value graph and executes the SHACL engine on it. */
  private async runValidation(
    loaded: LoadedShapes,
    rootType: string,
    rootValue: Record<string, unknown>,
    children: { key: string; type: string; values: Record<string, unknown>[] }[],
  ): Promise<ShapeViolation[]> {
    // One shared constraint table for the whole tree — JSON keys are unique
    // across the parent/child shape set, and `name` shares one constraint.
    const constraints = new Map<string, KeyConstraint>();
    for (const schema of loaded.schemaByKey.values()) {
      for (const keyConstraint of schema.keys) {
        if (!constraints.has(keyConstraint.key)) constraints.set(keyConstraint.key, keyConstraint);
      }
    }

    // Nest the children under their parent key so the graph builder produces
    // one connected tree with typed child nodes.
    const compositeValue: Record<string, unknown> = { ...rootValue };
    const childConfigs: ChildConfig[] = [];
    for (const child of children) {
      compositeValue[child.key] = child.values;
      childConfigs.push({ key: child.key, type: child.type });
    }
    const graph = buildDataGraph(compositeValue, rootType, constraints, childConfigs);

    const validator = new SHACLValidator(loaded.dataset);
    const report = await validator.validate(new Store(graph.quads));

    if (report.conforms) return [];
    return mapResults(report.results as ValidationReportResult[], graph.pathMap);
  }
}

/** Locates the NodeShape IRI among the parsed quads of a shape TTL. */
function findShapeIri(quads: Quad[]): string {
  for (const quad of quads) {
    if (
      quad.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' &&
      quad.object.value === 'http://www.w3.org/ns/shacl#NodeShape'
    ) {
      return quad.subject.value;
    }
  }
  throw new Error('The shape TTL contains no sh:NodeShape declaration.');
}

/** Maps the SHACL report onto JSON paths, recursing into sh:detail. */
function mapResults(
  results: ValidationReportResult[],
  pathMap: ReadonlyMap<string, string>,
): ShapeViolation[] {
  const violations: ShapeViolation[] = [];
  const seen = new Set<string>();

  const walk = (list: ValidationReportResult[]): void => {
    for (const result of list) {
      const base = result.focusNode ? (pathMap.get(result.focusNode.value) ?? '') : '';

      const pathTerm = Array.isArray(result.path) ? result.path[result.path.length - 1] : result.path;
      const key = keyOfPath(pathTerm ?? null);
      const jsonPath = key !== null ? (base ? `${base}.${key}` : key) : base;

      const message = Array.isArray(result.message)
        ? result.message.map((t) => t.value).join(' ')
        : (result.message?.value ?? 'Invalid value.');
      const severity = result.severity?.value.split(/[#/]/).pop() ?? 'Violation';

      // sh:node and sh:targetClass may both report the same violation — dedupe.
      const identity = `${result.focusNode?.value}|${pathTerm?.value ?? ''}|${message}`;
      if (!seen.has(identity)) {
        seen.add(identity);
        violations.push({ jsonPath, key: key ?? '', message, severity });
      }

      if (result.detail && result.detail.length > 0) walk(result.detail);
    }
  };

  walk(results);
  return violations;
}
