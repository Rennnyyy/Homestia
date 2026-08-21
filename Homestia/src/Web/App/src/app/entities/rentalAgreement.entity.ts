// Auto-generated from http://localhost:5001/api/entities/entity-definitions — do not edit manually.
// Entity: RentalAgreement  |  predicatePath: "rentalAgreement"  |  enum: false

import type { EntityInfo } from '../shared/services/aletheia-http-client.models';

// ── API response interface ────────────────────────────────────────────────

export interface RentalAgreement {
  /** closedAt */
  closedAt: unknown;
  /** createdAt */
  createdAt: string;
  /** end */
  end: unknown;
  /** start */
  start: string;
  /** terminatedAt */
  terminatedAt: unknown;
  /** hasAttachments → RentalAgreementDocument */
  attachments: unknown[];
  /** hasStatus → RentalAgreementStatus */
  status: unknown;
  /** includesUsageOf → Segmentation */
  segmentations: unknown[];
  /** rentedBy → Tenant */
  tenant: unknown;
  /** The entity's unique IRI. */
  iri: string;
}

// ── Dynamic form definition ───────────────────────────────────────────────

/** Pass to &lt;app-dynamic-entity-form [entity]="RentalAgreementEntity"&gt; */
export const RentalAgreementEntity: EntityInfo = {
  entityPath: 'rental-agreements',
  predicatePath: 'rentalAgreement',
  displayName: 'RentalAgreement',
  properties: [
    { name: 'closedAt', type: 'Nullable<DateTime>', isCollection: false },
    { name: 'createdAt', type: 'DateTime', isCollection: false },
    { name: 'end', type: 'Nullable<DateTime>', isCollection: false },
    { name: 'start', type: 'DateTime', isCollection: false },
    { name: 'terminatedAt', type: 'Nullable<DateTime>', isCollection: false },
    { name: 'attachments', type: 'EntityRef', isCollection: true, targetEntityPath: 'rental-agreement-documents' },
    { name: 'status', type: 'EntityRef', isCollection: false, targetEntityPath: 'rental-agreement-statuses' },
    { name: 'segmentations', type: 'EntityRef', isCollection: true, targetEntityPath: 'segmentations' },
    { name: 'tenant', type: 'EntityRef', isCollection: false, targetEntityPath: 'tenants' },
  ],
};
