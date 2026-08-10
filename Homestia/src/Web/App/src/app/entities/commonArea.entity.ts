// Auto-generated from http://localhost:5001/api/entities/entity-definitions — do not edit manually.
// Entity: CommonArea  |  predicatePath: "commonArea"  |  enum: false

import type { EntityInfo } from '../shared/services/aletheia-http-client.models';

// ── API response interface ────────────────────────────────────────────────

export interface CommonArea {
  /** equippedWith → InventoryItem */
  inventory: unknown[];
  /** isPartOf → Property */
  isPartOf: unknown;
  /** The entity's unique IRI. */
  iri: string;
}

// ── Dynamic form definition ───────────────────────────────────────────────

/** Pass to &lt;app-dynamic-entity-form [entity]="CommonAreaEntity"&gt; */
export const CommonAreaEntity: EntityInfo = {
  entityPath: 'common-areas',
  predicatePath: 'commonArea',
  displayName: 'CommonArea',
  properties: [
    { name: 'inventory', type: 'EntityRef', isCollection: true },
    { name: 'isPartOf', type: 'EntityRef', isCollection: false },
  ],
};
