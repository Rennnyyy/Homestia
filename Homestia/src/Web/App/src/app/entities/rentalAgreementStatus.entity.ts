// Auto-generated from http://localhost:5001/api/entities/entity-definitions — do not edit manually.
// Entity: RentalAgreementStatus  |  predicatePath: "rentalAgreementStatus"  |  enum: true

import type { EntityInfo } from '../shared/services/aletheia-http-client.models';

// ── API response interface ────────────────────────────────────────────────

export interface RentalAgreementStatus {
  /** key */
  key: string;
  /** displayName */
  displayName: string;
  /** The entity's unique IRI. */
  iri: string;
}

// ── Dynamic form definition ───────────────────────────────────────────────

/** Pass to &lt;app-dynamic-entity-form [entity]="RentalAgreementStatusEntity"&gt; */
export const RentalAgreementStatusEntity: EntityInfo = {
  entityPath: 'rental-agreement-statuses',
  predicatePath: 'rentalAgreementStatus',
  displayName: 'RentalAgreementStatus',
  properties: [
    { name: 'key', type: 'String', isCollection: false },
    { name: 'displayName', type: 'String', isCollection: false },
  ],
};

// ── Enumeration values ─────────────────────────────────────────────────

/** Valid keys for this enumeration. */
export const RentalAgreementStatusValues = {
  "preparation": "Preparation",
  "signed": "Signed",
  "active": "Active",
  "terminated": "Terminated",
  "handled": "Handled",
  "cancelled": "Cancelled",
} as const;

/** Union type of valid keys. */
export type RentalAgreementStatusKey = keyof typeof RentalAgreementStatusValues;
