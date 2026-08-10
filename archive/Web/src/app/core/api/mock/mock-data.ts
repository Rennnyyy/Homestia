import type { Property, PropertyType, RentalModel, Room, FurnishingStatus, RoomStatus, InventoryItem } from '../models';

const BASE = 'https://www.aletheia.arkenforge.de';

// ── Enumeration seed data (matching real Aletheia wire format) ────────────────

export const PROPERTY_TYPES: PropertyType[] = [
  { iri: `${BASE}/property-types/apartment`, key: 'apartment', displayName: 'Apartment' },
  { iri: `${BASE}/property-types/studio`, key: 'studio', displayName: 'Studio' },
];

export const RENTAL_MODELS: RentalModel[] = [
  { iri: `${BASE}/rental-models/entire-property`, key: 'entire-property', displayName: 'Entire Property' },
  { iri: `${BASE}/rental-models/single-room-rental-shared-living`, key: 'single-room-rental-shared-living', displayName: 'Single Room Rental — Shared Living' },
];

export const FURNISHING_STATUSES: FurnishingStatus[] = [
  { iri: `${BASE}/furnishing-statuses/unfurnished`, key: 'unfurnished', displayName: 'Unfurnished' },
  { iri: `${BASE}/furnishing-statuses/partially-furnished`, key: 'partially-furnished', displayName: 'Partially Furnished' },
  { iri: `${BASE}/furnishing-statuses/fully-furnished`, key: 'fully-furnished', displayName: 'Fully Furnished' },
];

export const ROOM_STATUSES: RoomStatus[] = [
  { iri: `${BASE}/room-statuses/available`, key: 'available', displayName: 'Available' },
  { iri: `${BASE}/room-statuses/reserved`, key: 'reserved', displayName: 'Reserved' },
  { iri: `${BASE}/room-statuses/actively-rented`, key: 'actively-rented', displayName: 'Actively Rented' },
  { iri: `${BASE}/room-statuses/blocked`, key: 'blocked', displayName: 'Blocked' },
];

// ── Sample entities ──────────────────────────────────────────────────────────

export const SAMPLE_PROPERTIES: Property[] = [
  {
    iri: `${BASE}/properties/prop-sunset`,
    name: 'Sunset Apartments',
    address: 'Sonnenallee 42, 12045 Berlin',
    propertyType: `${BASE}/property-types/apartment`,
    rentalModel: `${BASE}/rental-models/single-room-rental-shared-living`,
    segmentedInto: [`${BASE}/rooms/room-101`, `${BASE}/rooms/room-102`, `${BASE}/rooms/room-103`],
  },
  {
    iri: `${BASE}/properties/prop-garden`,
    name: 'Garden Studios',
    address: 'Gartenstrasse 15, 10115 Berlin',
    propertyType: `${BASE}/property-types/studio`,
    rentalModel: `${BASE}/rental-models/entire-property`,
    segmentedInto: [],
  },
];

export const SAMPLE_ROOMS: Room[] = [
  {
    iri: `${BASE}/rooms/room-101`,
    name: 'Room 101 — Sunny Side',
    isCommonArea: false,
    roomSize: 22.5,
    location: '1st floor, facing south',
    furnishingStatus: `${BASE}/furnishing-statuses/fully-furnished`,
    roomStatus: `${BASE}/room-statuses/available`,
    isPartOf: `${BASE}/properties/prop-sunset`, segmentedInto: [], equippedWith: [],
  },
  {
    iri: `${BASE}/rooms/room-102`,
    name: 'Room 102 — Garden View',
    isCommonArea: false,
    roomSize: 18.0,
    location: '1st floor, facing garden',
    furnishingStatus: `${BASE}/furnishing-statuses/partially-furnished`,
    roomStatus: `${BASE}/room-statuses/actively-rented`,
    isPartOf: `${BASE}/properties/prop-sunset`, segmentedInto: [], equippedWith: [],
  },
  {
    iri: `${BASE}/rooms/room-103`,
    name: 'Room 103 — Quiet Corner',
    isCommonArea: false,
    roomSize: 16.5,
    location: '2nd floor, facing courtyard',
    furnishingStatus: `${BASE}/furnishing-statuses/unfurnished`,
    roomStatus: `${BASE}/room-statuses/available`,
    isPartOf: `${BASE}/properties/prop-sunset`, segmentedInto: [], equippedWith: [],
  },
];

export const SAMPLE_INVENTORY: InventoryItem[] = [
  { iri: `${BASE}/inventory-items/inv-bed-01`, name: 'Double Bed Frame' },
  { iri: `${BASE}/inventory-items/inv-desk-01`, name: 'Writing Desk' },
  { iri: `${BASE}/inventory-items/inv-wardrobe-01`, name: 'Wardrobe' },
  { iri: `${BASE}/inventory-items/inv-chair-01`, name: 'Office Chair' },
  { iri: `${BASE}/inventory-items/inv-lamp-01`, name: 'Desk Lamp' },
];

// ── Initial store state ──────────────────────────────────────────────────────

export interface MockStore {
  properties: Property[];
  rooms: Room[];
  'landlords': unknown[];
  'inventory-items': InventoryItem[];
  'property-types': PropertyType[];
  'rental-models': RentalModel[];
  'furnishing-statuses': FurnishingStatus[];
  'room-statuses': RoomStatus[];
}

export function createInitialStore(): MockStore {
  return {
    properties: structuredClone(SAMPLE_PROPERTIES),
    rooms: structuredClone(SAMPLE_ROOMS),
    'landlords': [],
    'inventory-items': structuredClone(SAMPLE_INVENTORY),
    'property-types': structuredClone(PROPERTY_TYPES),
    'rental-models': structuredClone(RENTAL_MODELS),
    'furnishing-statuses': structuredClone(FURNISHING_STATUSES),
    'room-statuses': structuredClone(ROOM_STATUSES),
  };
}
