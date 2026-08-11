// Auto-generated from http://localhost:5000/api/entities/entity-definitions — do not edit manually.
// Entity: FurnishingStatus  |  predicatePath: "furnishingStatus"  |  enum: true

import type { EntityInfo } from '../shared/services/aletheia-http-client.models';

// ── API response interface ────────────────────────────────────────────────

export interface FurnishingStatus {
  /** key */
  key: string;
  /** displayName */
  displayName: string;
  /** The entity's unique IRI. */
  iri: string;
}

// ── Dynamic form definition ───────────────────────────────────────────────

/** Pass to &lt;app-dynamic-entity-form [entity]="FurnishingStatusEntity"&gt; */
export const FurnishingStatusEntity: EntityInfo = {
  entityPath: 'furnishing-statuses',
  predicatePath: 'furnishingStatus',
  displayName: 'FurnishingStatus',
  properties: [
    { name: 'key', type: 'String', isCollection: false },
    { name: 'displayName', type: 'String', isCollection: false },
  ],
};
