import type { AletheiaEntity, AletheiaEnum, EntityRef } from './entity.model';

// ── FurnishingStatus enumeration ──────────────────────────────────────────────

export interface FurnishingStatus extends AletheiaEnum {}

// ── RoomStatus enumeration ────────────────────────────────────────────────────

export interface RoomStatus extends AletheiaEnum {}

// ── Room entity ───────────────────────────────────────────────────────────────

export interface Room extends AletheiaEntity {
  name: string;
  isCommonArea: boolean;
  roomSize: number;
  location: string;
  furnishingStatus: EntityRef<FurnishingStatus>;
  roomStatus: EntityRef<RoomStatus>;
  equippedWith: EntityRef[];
  isPartOf: EntityRef;
  segmentedInto: EntityRef[];
}

/** Payload for creating a new Room. isPartOf links to the parent Property. */
export interface CreateRoomPayload {
  name: string;
  isCommonArea: boolean;
  roomSize: number;
  location: string;
  furnishingStatus: string; // IRI
  roomStatus: string;       // IRI
  isPartOf: string;         // IRI of the parent Property
}

/** Payload for updating an existing Room. */
export interface UpdateRoomPayload extends Partial<CreateRoomPayload> {}
