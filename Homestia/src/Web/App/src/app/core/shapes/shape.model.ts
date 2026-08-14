/**
 * ShapeMirror domain models — the types exchanged between the shape client,
 * schema extraction, graph construction, and the SHACL validator.
 */

/** Catalog metadata for one frontend shape (from GET /api/shapes). */
export interface ShapeInfo {
  key: string;
  iri: string;
  etag: string;
}

/** A single validation violation, mapped back onto JSON form paths. */
export interface ShapeViolation {
  /** Full JSON path of the offending value, e.g. `rooms[0].roomSize`. */
  jsonPath: string;
  /** The bare JSON key the violation points at (last path segment). */
  key: string;
  /** The sh:message authored in the shape. */
  message: string;
  /** SHACL severity local name (Violation / Warning / Info). */
  severity: string;
}

/** One sh:property extracted from a NodeShape. */
export interface KeyConstraint {
  /** JSON key — the sh:path local name. */
  key: string;
  /** sh:order value (display order). */
  order: number;
  /** sh:datatype IRI, null when not declared. */
  datatype: string | null;
  /** sh:nodeKind local name (`IRI`), null when not declared. */
  nodeKind: string | null;
}

/** The extracted schema of one shape: ordered keys + target classes. */
export interface ShapeSchema {
  /** IRI of the NodeShape. */
  shapeIri: string;
  /** sh:targetClass IRIs. */
  targetClasses: string[];
  /** Property constraints ordered by sh:order. */
  keys: KeyConstraint[];
  /** Key lookup by JSON key. */
  keyByName: ReadonlyMap<string, KeyConstraint>;
}

/** Configuration for one nested child collection in a composite graph. */
export interface ChildConfig {
  /** The JSON key under which children live on the parent (e.g. `rooms`). */
  key: string;
  /** The RDF class IRI each child node is typed with (falls back to the
   * child shape's sh:targetClass when omitted). */
  type?: string;
}

/** The result of building an RDF graph from a JSON value. */
export interface DataGraph {
  /** All quads of the value graph. */
  quads: import('@rdfjs/types').Quad[];
  /** The root focus node (typed with the root class). */
  focusNode: import('@rdfjs/types').BlankNode;
  /** Blank-node id → JSON path ('' for the root, `rooms[0]` for children). */
  pathMap: ReadonlyMap<string, string>;
}

/** Root entity type IRIs used by the Homestia shapes. */
export const PROPERTY_TYPE = 'urn:aletheia:homestia:Property';
export const ROOM_TYPE = 'urn:aletheia:homestia:Room';

/** Catalog IRIs of the Homestia shapes (served by the SDK exploration). */
export const PROPERTY_SHAPE_IRI = 'urn:aletheia:homestia:shapes:property';
export const ROOM_SHAPE_IRI = 'urn:aletheia:homestia:shapes:room';
