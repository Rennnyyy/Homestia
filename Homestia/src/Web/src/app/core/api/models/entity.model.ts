// ── Aletheia Entity wire format ───────────────────────────────────────────────
// The Aletheia SDK uses IRIs (Internationalized Resource Identifiers) as the
// primary entity identity mechanism. Every entity carries an `iri` field with
// a full URI like `https://www.aletheia.arkenforge.de/property-types/apartment`.
//
// Entity references in write payloads are plain IRI strings, NOT `{ iri: "..." }` objects.
// Example: `{ "propertyType": "https://.../property-types/apartment" }`
//
// Enumeration entities additionally carry a `key` field (the short identifier)
// and a `displayName` field (human-readable label).

/** Base interface for all Aletheia entities. */
export interface AletheiaEntity {
  iri: string;
}

/** An enumeration entity — has a `key` and `displayName` in addition to `iri`. */
export interface AletheiaEnum extends AletheiaEntity {
  key: string;
  displayName: string;
}

/**
 * An entity reference — either a string iri (compact form) or the full entity
 * (expanded form when the server includes nested entities).
 */
export type EntityRef<T extends AletheiaEntity = AletheiaEntity> = string | T;

/** Extract the iri from an EntityRef, whether string, object, or null. */
export function entityRefId(ref: EntityRef | null | undefined): string {
  if (ref == null) return '';
  return typeof ref === 'string' ? ref : ref.iri ?? '';
}

/** Paginated list response from /api/entities/{path}. */
export interface EntityListResponse<T extends AletheiaEntity> {
  items: T[];
  totalCount?: number;
}

