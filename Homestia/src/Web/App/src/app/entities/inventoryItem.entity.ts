// Auto-generated from http://localhost:5000/api/entities/entity-definitions — do not edit manually.
// Entity: InventoryItem  |  predicatePath: "inventoryItem"  |  enum: false

import type { EntityInfo } from '../shared/services/aletheia-http-client.models';

// ── API response interface ────────────────────────────────────────────────

export interface InventoryItem {
  /** name */
  name: string;
  /** The entity's unique IRI. */
  iri: string;
}

// ── Dynamic form definition ───────────────────────────────────────────────

/** Pass to &lt;app-dynamic-entity-form [entity]="InventoryItemEntity"&gt; */
export const InventoryItemEntity: EntityInfo = {
  entityPath: 'inventory-items',
  predicatePath: 'inventoryItem',
  displayName: 'InventoryItem',
  properties: [
    { name: 'name', type: 'String', isCollection: false },
  ],
};
