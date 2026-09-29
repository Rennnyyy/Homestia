/** Entity type for Landlord — generated from backend introspection. Do not edit. */
export interface Landlords {
  /** The record's IRI — the identity every route is called with. */
  iri: string;
  /** representedBy (EntityRef → Agent) */
  agent: unknown;
  /** owns (EntityRef → Property) */
  properties: unknown[];
  /** landlordType (EntityRef → PropertyType) */
  landlordType: unknown;
}
