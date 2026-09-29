/** Entity type for FurnishingStatus — generated from backend introspection. Do not edit. */
export interface FurnishingStatus {
  /** The record's IRI — the identity every route is called with. */
  iri: string;
  /** key */
  key: string;
  /** displayName */
  displayName: string;
}
/** Stable key union for the FurnishingStatus enumeration — generated. Do not edit. */
export type FurnishingStatusKey = 'unfurnished' | 'partially-furnished' | 'fully-furnished';
