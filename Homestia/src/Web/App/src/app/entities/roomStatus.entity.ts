// Auto-generated from http://localhost:5000/api/entities/entity-definitions — do not edit manually.
// Entity: RoomStatus  |  predicatePath: "roomStatus"  |  enum: true

import type { EntityInfo } from '../shared/services/aletheia-http-client.models';

// ── API response interface ────────────────────────────────────────────────

export interface RoomStatus {
  /** key */
  key: string;
  /** displayName */
  displayName: string;
  /** The entity's unique IRI. */
  iri: string;
}

// ── Dynamic form definition ───────────────────────────────────────────────

/** Pass to &lt;app-dynamic-entity-form [entity]="RoomStatusEntity"&gt; */
export const RoomStatusEntity: EntityInfo = {
  entityPath: 'room-statuses',
  predicatePath: 'roomStatus',
  displayName: 'RoomStatus',
  properties: [
    { name: 'key', type: 'String', isCollection: false },
    { name: 'displayName', type: 'String', isCollection: false },
  ],
};
