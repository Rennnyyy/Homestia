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
  /** sh:description text, null when not declared (shown as field visual help). */
  description: string | null;
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

/**
 * Catalog IRIs of the rental stage shapes. Each stage carries its own target
 * class (<c>urn:aletheia:homestia:Rental:&lt;stage&gt;</c>) so the backend view
 * engine validates a stage in isolation — the whole stage sequence gates the
 * rental lifecycle: stage N unlocks stage N+1.
 */
export const RENTAL_APPLICATION_SHAPE_IRI = 'urn:aletheia:homestia:shapes:rental:application';
export const RENTAL_CONTRACT_SHAPE_IRI = 'urn:aletheia:homestia:shapes:rental:contract';
export const RENTAL_DEPOSIT_SHAPE_IRI = 'urn:aletheia:homestia:shapes:rental:deposit';
export const RENTAL_HANDOVER_SHAPE_IRI = 'urn:aletheia:homestia:shapes:rental:handover';
export const RENTAL_TENANCY_SHAPE_IRI = 'urn:aletheia:homestia:shapes:rental:tenancy';
export const RENTAL_NOTICED_SHAPE_IRI = 'urn:aletheia:homestia:shapes:rental:noticed';
export const RENTAL_HANDBACK_SHAPE_IRI = 'urn:aletheia:homestia:shapes:rental:handback';
export const RENTAL_TERMINATED_SHAPE_IRI = 'urn:aletheia:homestia:shapes:rental:terminated';
