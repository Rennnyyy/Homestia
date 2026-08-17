/**
 * ShapeMirror domain models — the types exchanged between the shape client,
 * schema extraction, and the backend view validation endpoint.
 */

/** Catalog metadata for one frontend shape (from GET /api/shapes). */
export interface ShapeInfo {
  key: string;
  iri: string;
  etag: string;
}

/** A single validation finding, mapped back onto JSON form paths. */
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

/** The response of POST /api/entities/aspect-definitions/{iri}/validate. */
export interface ViewValidationResponse {
  /** False when any finding exists — SHACL semantics, warnings included. */
  conforms: boolean;
  /** Findings of every severity, mapped to JSON paths. */
  findings: ShapeViolation[];
}

/** Root entity type IRIs used by the Homestia shapes. */
export const PROPERTY_TYPE = 'urn:aletheia:homestia:Property';
export const ROOM_TYPE = 'urn:aletheia:homestia:Room';

/** Catalog IRIs of the Homestia shapes (served by the SDK exploration). */
export const PROPERTY_SHAPE_IRI = 'urn:aletheia:homestia:shapes:property';
export const ROOM_SHAPE_IRI = 'urn:aletheia:homestia:shapes:room';
