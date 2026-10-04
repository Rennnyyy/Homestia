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
  /** landlord (EntityRef → Landlord) */
  landlord: unknown;
  /** isPartOf (EntityRef → Property) */
  isPartOf: unknown;
  /** propertyType (EntityRef → PropertyType) */
  propertyType: unknown;
  /** rentalModel (EntityRef → RentalModel) */
  rentalModel: unknown;
  /** segmentedInto (EntityRef → Segmentation) */
  segmentedInto: unknown[];
}
