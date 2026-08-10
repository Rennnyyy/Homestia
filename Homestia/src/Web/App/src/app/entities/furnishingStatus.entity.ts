// Auto-generated from http://localhost:5001/api/entities/entity-definitions — do not edit manually.
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

// ── Enumeration values ─────────────────────────────────────────────────

/** Valid keys for this enumeration. */
export const FurnishingStatusValues = {
  "unfurnished": "Unfurnished",
  "partially-furnished": "Partially Furnished",
  "fully-furnished": "Fully Furnished",
} as const;

/** Union type of valid keys. */
export type FurnishingStatusKey = keyof typeof FurnishingStatusValues;
