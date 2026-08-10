export type { AletheiaEntity, AletheiaEnum, EntityRef, EntityListResponse } from './entity.model';
export { entityRefId } from './entity.model';

export type {
  Property,
  PropertyType,
  RentalModel,
  CreatePropertyPayload,
  UpdatePropertyPayload,
} from './property.model';

export type {
  Room,
  FurnishingStatus,
  RoomStatus,
  CreateRoomPayload,
  UpdateRoomPayload,
} from './room.model';

export type {
  Landlord,
  CreateLandlordPayload,
  UpdateLandlordPayload,
} from './landlord.model';

export type {
  InventoryItem,
  CreateInventoryItemPayload,
  UpdateInventoryItemPayload,
} from './inventory-item.model';
