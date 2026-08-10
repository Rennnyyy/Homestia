import type { AletheiaEntity, EntityRef } from './entity.model';
import type { PropertyType } from './property.model';

// ── Landlord entity ───────────────────────────────────────────────────────────

export interface Landlord extends AletheiaEntity {
  landlordType: EntityRef<PropertyType>;
  representedBy: EntityRef; // → Aletheia.Authentication.Agent
  owns: EntityRef[];        // → Property[]
}

/** Payload for creating a new Landlord. Entity references are plain IRI strings. */
export interface CreateLandlordPayload {
  landlordType: string; // IRI
}

/** Payload for updating an existing Landlord. */
export interface UpdateLandlordPayload extends Partial<CreateLandlordPayload> {}
