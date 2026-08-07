import type { SelectOption } from '../../shared/components';

/** Raw shape of the property creation form. */
export interface PropertyFormValue {
  name: string;
  propertyType: string;
  rentalModel: string;
  address: string;
}

/** Initial (empty) form state. */
export const EMPTY_PROPERTY_FORM: PropertyFormValue = {
  name: '',
  propertyType: '',
  rentalModel: '',
  address: '',
};

/**
 * Backend-aligned option lists.
 * Keys match the Aletheia enumeration identity keys (PropertyType.Key, RentalModel.Key).
 * Labels are translation keys resolved by the | translate pipe in the template.
 */
export const PROPERTY_TYPE_OPTIONS: SelectOption[] = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'studio', label: 'Studio' },
];

export const RENTAL_MODEL_OPTIONS: SelectOption[] = [
  { value: 'entire-property', label: 'Entire Property' },
  { value: 'single-room-rental-shared-living', label: 'Single Room Rental — Shared Living' },
];
