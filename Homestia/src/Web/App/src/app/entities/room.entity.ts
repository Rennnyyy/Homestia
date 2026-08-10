// Auto-generated from http://localhost:5001/api/entities/entity-definitions — do not edit manually.
// Entity: Room  |  predicatePath: "room"  |  enum: false

import type { EntityInfo } from '../shared/services/aletheia-http-client.models';

// ── API response interface ────────────────────────────────────────────────

export interface Room {
  /** location */
  location: string;
  /** roomSize */
  roomSize: number;
  /** furnishingStatus → FurnishingStatus */
  furnishingStatus: unknown;
  /** equippedWith → InventoryItem */
  inventory: unknown[];
  /** isPartOf → Property */
  isPartOf: unknown;
  /** roomStatus → RoomStatus */
  roomStatus: unknown;
  /** The entity's unique IRI. */
  iri: string;
}

// ── Dynamic form definition ───────────────────────────────────────────────

/** Pass to &lt;app-dynamic-entity-form [entity]="RoomEntity"&gt; */
export const RoomEntity: EntityInfo = {
  entityPath: 'room',
  predicatePath: 'room',
  displayName: 'Room',
  properties: [
    { name: 'location', type: 'String', isCollection: false },
    { name: 'roomSize', type: 'Decimal', isCollection: false },
    { name: 'furnishingStatus', type: 'EntityRef', isCollection: false },
    { name: 'inventory', type: 'EntityRef', isCollection: true },
    { name: 'isPartOf', type: 'EntityRef', isCollection: false },
    { name: 'roomStatus', type: 'EntityRef', isCollection: false },
  ],
};
