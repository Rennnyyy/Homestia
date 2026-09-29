/** Entity type for Segmentation — generated from backend introspection. Do not edit. */
export interface Segmentations {
  /** The record's IRI — the identity every route is called with. */
  iri: string;
  /** isCommonArea */
  isCommonArea: boolean;
  /** name */
  name: string;
  /** isPartOf (EntityRef → Property) */
  isPartOf: unknown;
}
