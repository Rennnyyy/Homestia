
/** Generic select option shape. `labelKey` is an i18n key resolved via `| translate`. */
export interface SelectOption<T = string> {
  value: T;
  labelKey: string;
}

/** Raw shape of the property creation form. */
export interface PropertyFormValue {
  name: string;
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
