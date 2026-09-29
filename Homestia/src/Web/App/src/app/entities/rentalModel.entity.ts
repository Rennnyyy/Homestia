/** Entity type for RentalModel — generated from backend introspection. Do not edit. */
export interface RentalModel {
  /** The record's IRI — the identity every route is called with. */
  iri: string;
  /** key */
  key: string;
  /** displayName */
  displayName: string;
}
/** Stable key union for the RentalModel enumeration — generated. Do not edit. */
export type RentalModelKey = 'entire-property' | 'single-room-rental-shared-living';
