import { DataFactory } from 'n3';
import type { NamedNode, Term } from '@rdfjs/types';

/**
 * RDF vocabulary constants and helpers for the ShapeMirror.
 *
 * The predicate namespace doubles as the JSON-key namespace: the IRI local
 * name IS the JSON key. `sh:path homestia:roomSize` maps 1:1 to the form
 * field `roomSize` — this is the bridge between SHACL and the UI.
 */

/** Predicate namespace — local names are the JSON keys. */
export const HOMESTIA_NS = 'https://www.aletheia.arkenforge.de/predicates/homestia/';

/** SHACL vocabulary. */
export const SH = 'http://www.w3.org/ns/shacl#';

/** XSD datatypes. */
export const XSD = 'http://www.w3.org/2001/XMLSchema#';

/** rdf:type predicate. */
export const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

/** XSD datatype IRIs used by Homestia shapes. */
export const XSD_STRING = `${XSD}string`;
export const XSD_BOOLEAN = `${XSD}boolean`;
export const XSD_DECIMAL = `${XSD}decimal`;
export const XSD_DOUBLE = `${XSD}double`;

/** Builds the predicate NamedNode for a JSON key. */
export function predicate(key: string): NamedNode {
  return DataFactory.namedNode(HOMESTIA_NS + key);
}

/** Builds the class NamedNode for an entity type IRI. */
export function typeNode(typeIri: string): NamedNode {
  return DataFactory.namedNode(typeIri);
}

/**
 * Extracts the JSON key from a path term: returns the local name when the
 * term is a predicate in the Homestia namespace, null otherwise.
 */
export function keyOfPath(pathTerm: Term | null | undefined): string | null {
  if (!pathTerm || pathTerm.termType !== 'NamedNode') return null;
  const iri = pathTerm.value;
  if (!iri.startsWith(HOMESTIA_NS)) return null;
  return iri.slice(HOMESTIA_NS.length);
}

/** Local name of an IRI (after the last `#` or `/`). */
export function localName(iri: string): string {
  const index = Math.max(iri.lastIndexOf('#'), iri.lastIndexOf('/'));
  return index >= 0 ? iri.slice(index + 1) : iri;
}

/** SHACL vocabulary term builder. */
export function sh(local: string): NamedNode {
  return DataFactory.namedNode(SH + local);
}
