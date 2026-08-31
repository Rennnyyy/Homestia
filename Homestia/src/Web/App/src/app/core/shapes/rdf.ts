import { DataFactory } from 'n3';
import type { Term } from '@rdfjs/types';

/**
 * RDF vocabulary constants and helpers for the ShapeMirror.
 *
 * The canonical JSON namespace doubles as the JSON-key namespace: the IRI
 * local name IS the JSON key. `sh:path json:roomSize` maps 1:1 to the form
 * field `roomSize` — this is the bridge between SHACL and the UI, owned by
 * the backend view engine (Aspect.JsonNamespace).
 */

/** Canonical JSON predicate namespace — local names are the JSON keys. */
export const JSON_NS = 'https://aletheia.katharsis.digital/json/';

/** SHACL vocabulary. */
export const SH = 'http://www.w3.org/ns/shacl#';

/**
 * Extracts the JSON key from a path term: returns the local name when the
 * term is a predicate in the canonical JSON namespace, null otherwise.
 */
export function keyOfPath(pathTerm: Term | null | undefined): string | null {
  if (!pathTerm || pathTerm.termType !== 'NamedNode') return null;
  const iri = pathTerm.value;
  if (!iri.startsWith(JSON_NS)) return null;
  return iri.slice(JSON_NS.length);
}

/** Local name of an IRI (after the last `#` or `/`). */
export function localName(iri: string): string {
  const index = Math.max(iri.lastIndexOf('#'), iri.lastIndexOf('/'));
  return index >= 0 ? iri.slice(index + 1) : iri;
}

/** SHACL vocabulary term builder. */
export function sh(local: string): ReturnType<typeof DataFactory.namedNode> {
  return DataFactory.namedNode(SH + local);
}
