/** Entity type for RentalStage — generated from backend introspection. Do not edit. */
export interface RentalStage {
  /** The record's IRI — the identity every route is called with. */
  iri: string;
  /** key */
  key: string;
  /** displayName */
  displayName: string;
}
/** Stable key union for the RentalStage enumeration — generated. Do not edit. */
export type RentalStageKey = 'application' | 'contract' | 'deposit' | 'handover' | 'tenancy' | 'noticed' | 'handback' | 'terminated';
