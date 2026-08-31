// Auto-generated from http://localhost:5000/api/entities/entity-definitions — do not edit manually.
// Entity: Room  |  predicatePath: "room"  |  enum: false

import type { EntityInfo } from '../shared/services/aletheia-http-client.models';

// ── API response interface ────────────────────────────────────────────────

export interface Room {
  /** location */
  location: string;
  /** roomSize */
  roomSize?: number | null;
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
  /** Inherited — resolved from entity hierarchy. */
  isCommonArea: boolean;
  /** Inherited — resolved from entity hierarchy. */
  name: string;
}

// ── Dynamic form definition ───────────────────────────────────────────────

/** Pass to &lt;app-dynamic-entity-form [entity]="RoomEntity"&gt; */
export const RoomEntity: EntityInfo = {
  entityPath: 'rooms',
  predicatePath: 'room',
  displayName: 'Room',
  properties: [
    { name: 'location', type: 'String', isCollection: false },
    { name: 'roomSize', type: 'Decimal', isCollection: false },
    { name: 'furnishingStatus', type: 'EntityRef', isCollection: false, targetEntityPath: 'furnishing-statuses' },
    { name: 'inventory', type: 'EntityRef', isCollection: true, targetEntityPath: 'inventory-items' },
    { name: 'isPartOf', type: 'EntityRef', isCollection: false, targetEntityPath: 'properties' },
    { name: 'roomStatus', type: 'EntityRef', isCollection: false, targetEntityPath: 'room-statuses' },
    { name: 'isCommonArea', type: 'Boolean', isCollection: false },
    { name: 'name', type: 'String', isCollection: false },
  ],
};
