import { DataFactory } from 'n3';
import type { BlankNode, NamedNode, Quad, Quad_Object } from '@rdfjs/types';
import { predicate, RDF_TYPE, XSD_BOOLEAN, XSD_DECIMAL, XSD_DOUBLE, XSD_STRING } from './rdf';
import type { ChildConfig, DataGraph, KeyConstraint } from './shape.model';

const { blankNode, namedNode, literal, quad } = DataFactory;

/**
 * Converts a JSON form value into an RDF graph the SHACL engine can judge.
 *
 * The shape's key constraints steer the conversion:
 * - keys whose sh:nodeKind is IRI are emitted as NamedNodes, and skipped
 *   entirely when empty (so optional references stay absent);
 * - numeric keys are typed with the shape's declared datatype;
 * - nested arrays become blank child nodes, each tracked in the path map
 *   so violations can be reported back as JSON paths like `rooms[0].name`.
 */
export function buildDataGraph(
  rootValue: Record<string, unknown>,
  rootType: string,
  constraints: ReadonlyMap<string, KeyConstraint>,
  childConfigs: readonly ChildConfig[] = [],
): DataGraph {
  const quads: Quad[] = [];
  const pathMap = new Map<string, string>();
  const focusNode = blankNode();

  quads.push(quad(focusNode, namedNode(RDF_TYPE), namedNode(rootType)));
  pathMap.set(focusNode.value, '');
  writeObject(quads, pathMap, focusNode, rootValue, '', constraints, childConfigs);

  return { quads, focusNode, pathMap };
}

/** Writes one object (the root or a child) into the graph. */
function writeObject(
  quads: Quad[],
  pathMap: Map<string, string>,
  subject: BlankNode,
  value: Record<string, unknown>,
  basePath: string,
  constraints: ReadonlyMap<string, KeyConstraint>,
  childConfigs: readonly ChildConfig[],
): void {
  for (const [key, raw] of Object.entries(value)) {
    const constraint = constraints.get(key);
    const childConfig = childConfigs.find((c) => c.key === key);
    const predicateNode = predicate(key);

    if (raw === null || raw === undefined) continue;

    if (Array.isArray(raw)) {
      raw.forEach((element, index) => {
        const childPath = basePath ? `${basePath}.${key}[${index}]` : `${key}[${index}]`;
        const term = termFor(element, constraint, quads, pathMap, childPath, childConfig, constraints, childConfigs);
        if (term) quads.push(quad(subject, predicateNode, term));
      });
      continue;
    }

    const term = termFor(raw, constraint, quads, pathMap, basePath ? `${basePath}.${key}` : key, childConfig, constraints, childConfigs);
    if (term) quads.push(quad(subject, predicateNode, term));
  }
}

/** Converts a single JSON value into an RDF term (or null to skip it). */
function termFor(
  value: unknown,
  constraint: KeyConstraint | undefined,
  quads: Quad[],
  pathMap: Map<string, string>,
  path: string,
  childConfig: ChildConfig | undefined,
  constraints: ReadonlyMap<string, KeyConstraint>,
  childConfigs: readonly ChildConfig[],
): Quad_Object | null {
  const nodeKind = constraint?.nodeKind ?? null;
  const datatype = constraint?.datatype ?? null;

  if (typeof value === 'string') {
    if (value.length === 0) {
      // Empty strings: keep them only for xsd:string keys (minLength then
      // reports the violation); skip for IRI references and numeric types.
      if (nodeKind === 'IRI') return null;
      if (datatype !== null && !datatype.endsWith('string')) return null;
      return literal(value, namedNode(XSD_STRING));
    }
    if (nodeKind === 'IRI') return namedNode(value);
    return literal(value, namedNode(datatype ?? XSD_STRING));
  }

  if (typeof value === 'number') {
    return literal(String(value), namedNode(datatype ?? XSD_DOUBLE));
  }

  if (typeof value === 'boolean') {
    return literal(value ? 'true' : 'false', namedNode(XSD_BOOLEAN));
  }

  if (typeof value === 'object') {
    const iri = (value as { iri?: unknown }).iri;
    if (typeof iri === 'string' && iri.length > 0) return namedNode(iri);

    // Plain nested object → blank child node.
    const child = blankNode();
    pathMap.set(child.value, path);
    if (childConfig && childConfig.type) {
      quads.push(quad(child, namedNode(RDF_TYPE), namedNode(childConfig.type)));
    }
    writeObject(
      quads,
      pathMap,
      child,
      value as Record<string, unknown>,
      path,
      constraints,
      childConfigs,
    );
    return child;
  }

  return null;
}
