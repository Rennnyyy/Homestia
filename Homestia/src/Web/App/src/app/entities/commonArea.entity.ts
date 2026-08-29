// Auto-generated from http://localhost:5000/api/entities/entity-definitions — do not edit manually.
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
  /** Inherited — resolved from entity hierarchy. */
  isCommonArea: boolean;
  /** Inherited — resolved from entity hierarchy. */
  name: string;
}

// ── Dynamic form definition ───────────────────────────────────────────────

/** Pass to &lt;app-dynamic-entity-form [entity]="CommonAreaEntity"&gt; */
export const CommonAreaEntity: EntityInfo = {
  entityPath: 'common-areas',
  predicatePath: 'commonArea',
  displayName: 'CommonArea',
  properties: [
    { name: 'inventory', type: 'EntityRef', isCollection: true, targetEntityPath: 'inventory-items' },
    { name: 'isPartOf', type: 'EntityRef', isCollection: false, targetEntityPath: 'properties' },
    { name: 'isCommonArea', type: 'Boolean', isCollection: false },
    { name: 'name', type: 'String', isCollection: false },
  ],
};
