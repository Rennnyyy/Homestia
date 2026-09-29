/** Entity type for Property — generated from backend introspection. Do not edit. */
export interface Property {
  /** The record's IRI — the identity every route is called with. */
  iri: string;
  /** isCommonArea */
  isCommonArea: boolean;
  /** name */
  name: string;
  /** address */
  address: string;
  /** isPartOf (EntityRef → Property) */
  isPartOf: unknown;
  /** propertyType (EntityRef → PropertyType) */
  propertyType: unknown;
  /** rentalModel (EntityRef → RentalModel) */
  rentalModel: unknown;
}
