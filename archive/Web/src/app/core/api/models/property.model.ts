import type { AletheiaEntity, AletheiaEnum, EntityRef } from './entity.model';

// ── PropertyType enumeration ──────────────────────────────────────────────────

export interface PropertyType extends AletheiaEnum {}

// ── RentalModel enumeration ───────────────────────────────────────────────────

export interface RentalModel extends AletheiaEnum {}

// ── Property entity ──────────────────────────────────────────────────────────

export interface Property extends AletheiaEntity {
  name: string;
  address: string;
  propertyType: EntityRef<PropertyType>;
  rentalModel: EntityRef<RentalModel>;
  segmentedInto: EntityRef[];
}

/** Payload for creating a new Property. */
export interface CreatePropertyPayload {
  name: string;
  address: string;
  propertyType: string; // IRI
  rentalModel: string;  // IRI
}

/** Payload for updating an existing Property. All fields optional. */
export interface UpdatePropertyPayload {
  name?: string;
  address?: string;
  propertyType?: string;
  rentalModel?: string;
}
