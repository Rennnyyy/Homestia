import { DataFactory } from 'n3';
import type { DatasetCore } from '@rdfjs/types';
import { keyOfPath, localName, sh } from './rdf';
import type { KeyConstraint, ShapeSchema } from './shape.model';

/**
 * Extracts the UI schema from a NodeShape.
 *
 * This is the "configuration" half of the ShapeMirror: every `sh:property`
 * is a JSON key, `sh:order` defines field and column order, `sh:datatype`
 * and `sh:nodeKind` steer how form values are converted into RDF.
 */
export function extractSchema(dataset: DatasetCore, shapeIri: string): ShapeSchema {
  const shapeNode = DataFactory.namedNode(shapeIri);

  const targetClasses = [...dataset.match(shapeNode, sh('targetClass'), null)]
    .map((quad) => quad.object)
    .filter((term): term is import('@rdfjs/types').NamedNode => term.termType === 'NamedNode')
    .map((term) => term.value);

  const keys: KeyConstraint[] = [];
  for (const propertyQuad of dataset.match(shapeNode, sh('property'), null)) {
    const propertyNode = propertyQuad.object;
    if (propertyNode.termType !== 'NamedNode' && propertyNode.termType !== 'BlankNode') continue;

    const pathTerms = [...dataset.match(propertyNode, sh('path'), null)].map((q) => q.object);
    if (pathTerms.length === 0) continue;

    // Homestia shapes declare single, direct paths — sequences are out of scope.
    const key = keyOfPath(pathTerms[0]);
    if (key === null) continue;

    const orderTerm = [...dataset.match(propertyNode, sh('order'), null)].map((q) => q.object)[0];
    const datatypeTerm = [...dataset.match(propertyNode, sh('datatype'), null)].map((q) => q.object)[0];
    const nodeKindTerm = [...dataset.match(propertyNode, sh('nodeKind'), null)].map((q) => q.object)[0];

    keys.push({
      key,
      order: orderTerm?.termType === 'Literal' && !Number.isNaN(Number(orderTerm.value)) ? Number(orderTerm.value) : 0,
      datatype: datatypeTerm?.termType === 'NamedNode' ? datatypeTerm.value : null,
      nodeKind: nodeKindTerm?.termType === 'NamedNode' ? localName(nodeKindTerm.value) : null,
    });
  }

  keys.sort((a, b) => a.order - b.order || a.key.localeCompare(b.key));

  return {
    shapeIri,
    targetClasses,
    keys,
    keyByName: new Map(keys.map((k) => [k.key, k])),
  };
}
