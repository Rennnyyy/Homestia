/** Entity type for RoomStatus — generated from backend introspection. Do not edit. */
export interface RoomStatus {
  /** The record's IRI — the identity every route is called with. */
  iri: string;
  /** key */
  key: string;
  /** displayName */
  displayName: string;
}
/** Stable key union for the RoomStatus enumeration — generated. Do not edit. */
export type RoomStatusKey = 'available' | 'reserved' | 'actively-rented' | 'blocked';
