
/** Generic select option shape. `labelKey` is an i18n key resolved via `| translate`. */
export interface SelectOption<T = string> {
  value: T;
  labelKey: string;
}

/** Raw shape of the property creation form. */
export interface PropertyFormValue {
  name: string;
  address: string;
  propertyType: string;
  rentalModel: string;
}

/** Raw shape of a single room in the creation flow. */
export interface RoomFormValue {
  name: string;
  furnishingStatus: string;
  roomStatus: string;
}

/** Complete property creation payload (rooms excluded when rental model is EntireProperty). */
export interface PropertyCreatePayload {
  property: PropertyFormValue;
  rooms: RoomFormValue[];
}

/** Initial (empty) property form state. */
export const EMPTY_PROPERTY_FORM: PropertyFormValue = {
  name: '',
  address: '',
  propertyType: '',
  rentalModel: '',
};

/** Initial (empty) room form state. */
export const EMPTY_ROOM_FORM: RoomFormValue = {
  name: '',
  furnishingStatus: '',
  roomStatus: '',
};

/**
 * Backend-aligned option lists.
 * Keys match the Aletheia enumeration identity keys.
 * `labelKey` references an i18n key under `ENUMS.*`.
 */
export const PROPERTY_TYPE_OPTIONS: SelectOption[] = [
  { value: 'apartment', labelKey: 'ENUMS.PROPERTY_TYPE.APARTMENT' },
  { value: 'studio', labelKey: 'ENUMS.PROPERTY_TYPE.STUDIO' },
];

export const RENTAL_MODEL_OPTIONS: SelectOption[] = [
  { value: 'entire-property', labelKey: 'ENUMS.RENTAL_MODEL.ENTIRE_PROPERTY' },
  { value: 'single-room-rental-shared-living', labelKey: 'ENUMS.RENTAL_MODEL.SINGLE_ROOM' },
];

export const FURNISHING_STATUS_OPTIONS: SelectOption[] = [
  { value: 'unfurnished', labelKey: 'ENUMS.FURNISHING.UNFURNISHED' },
  { value: 'partially-furnished', labelKey: 'ENUMS.FURNISHING.PARTIALLY_FURNISHED' },
  { value: 'fully-furnished', labelKey: 'ENUMS.FURNISHING.FULLY_FURNISHED' },
];

export const ROOM_STATUS_OPTIONS: SelectOption[] = [
  { value: 'available', labelKey: 'ENUMS.ROOM_STATUS.AVAILABLE' },
  { value: 'reserved', labelKey: 'ENUMS.ROOM_STATUS.RESERVED' },
  { value: 'actively-rented', labelKey: 'ENUMS.ROOM_STATUS.ACTIVELY_RENTED' },
  { value: 'blocked', labelKey: 'ENUMS.ROOM_STATUS.BLOCKED' },
];

/** Rental model keys that trigger the room-count / per-room workflow. */
export const ROOM_BASED_RENTAL_MODELS = new Set(['single-room-rental-shared-living']);

// ── Mapping helpers: form model ↔ API model ──────────────────────────────────

import type { Property, Room, CreatePropertyPayload, CreateRoomPayload } from '../../core/api';
import { entityRefId } from '../../core/api';

/** Extract the last path segment from an IRI (e.g. "https://.../property-types/apartment" → "apartment"). */
function iriToKey(iri: string): string {
  if (!iri) return '';
  return iri.split('/').pop() ?? iri;
}

/** Map a backend Property entity to the UI form model. */
export function propertyToFormValue(property: Property): PropertyFormValue {
  return {
    name: property.name ?? '',
    address: property.address ?? '',
    propertyType: iriToKey(entityRefId(property.propertyType)),
    rentalModel: iriToKey(entityRefId(property.rentalModel)),
  };
}

/** Map a backend Room entity to the UI room form model. */
export function roomToFormValue(room: Room): RoomFormValue {
  return {
    name: room.name ?? '',
    furnishingStatus: iriToKey(entityRefId(room.furnishingStatus)),
    roomStatus: iriToKey(entityRefId(room.roomStatus)),
  };
}

/** Map UI form values to an API CreateProperty payload. */
export function formValueToCreatePayload(
  form: PropertyFormValue,
  propertyTypeIri: string,
  rentalModelIri: string,
): CreatePropertyPayload {
  return {
    name: form.name,
    address: form.address,
    propertyType: propertyTypeIri,
    rentalModel: rentalModelIri,
  };
}

/** Map a UI room form value to an API CreateRoom payload. isPartOf links to the parent Property. */
export function roomFormToCreatePayload(
  room: RoomFormValue,
  furnishingStatusIri: string,
  roomStatusIri: string,
  isPartOfIri: string,
): CreateRoomPayload {
  return {
    name: room.name,
    isCommonArea: false,
    roomSize: 0,
    location: '',
    furnishingStatus: furnishingStatusIri,
    roomStatus: roomStatusIri,
    isPartOf: isPartOfIri,
  };
}
