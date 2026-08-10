import type { AletheiaEntity } from './entity.model';

// ── InventoryItem entity ──────────────────────────────────────────────────────

export interface InventoryItem extends AletheiaEntity {
  name: string;
}

/** Payload for creating a new InventoryItem. */
export interface CreateInventoryItemPayload {
  name: string;
}

/** Payload for updating an existing InventoryItem. */
export interface UpdateInventoryItemPayload extends Partial<CreateInventoryItemPayload> {}
