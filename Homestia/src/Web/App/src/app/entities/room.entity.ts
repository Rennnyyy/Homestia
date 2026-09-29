/** Entity type for Room — generated from backend introspection. Do not edit. */
export interface Room {
  /** The record's IRI — the identity every route is called with. */
  iri: string;
  /** isCommonArea */
  isCommonArea: boolean;
  /** name */
  name: string;
  /** location */
  location: string;
  /** roomSize */
  roomSize: unknown;
  /** furnishingStatus (EntityRef → FurnishingStatus) */
  furnishingStatus: unknown;
  /** equippedWith (EntityRef → InventoryItem) */
  inventory: unknown[];
  /** isPartOf (EntityRef → Property) */
  isPartOf: unknown;
  /** roomStatus (EntityRef → RoomStatus) */
  roomStatus: unknown;
}
