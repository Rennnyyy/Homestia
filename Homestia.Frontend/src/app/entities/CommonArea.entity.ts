/** Entity type for CommonArea — generated from backend introspection. Do not edit. */
export interface CommonArea {
  /** The record's IRI — the identity every route is called with. */
  iri: string;
  /** isCommonArea */
  isCommonArea: boolean;
  /** name */
  name: string;
  /** equippedWith (EntityRef → InventoryItem) */
  inventory: unknown[];
  /** isPartOf (EntityRef → Property) */
  isPartOf: unknown;
}
