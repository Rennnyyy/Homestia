// Auto-generated from http://localhost:5000/api/entities/entity-definitions — do not edit manually.
// Entity: Rental  |  predicatePath: "rental"  |  enum: false

import type { EntityInfo } from '../shared/services/aletheia-http-client.models';

// ── API response interface ────────────────────────────────────────────────

export interface Rental {
  /** damageConfirmed */
  damageConfirmed: boolean;
  /** depositAmount */
  depositAmount: number;
  /** depositPaid */
  depositPaid: boolean;
  /** depositPaymentDate */
  depositPaymentDate: string;
  /** depositReturned */
  depositReturned: boolean;
  /** handbackDate */
  handbackDate: string;
  /** handbackNotes */
  handbackNotes: string;
  /** handoverDate */
  handoverDate: string;
  /** handoverNotes */
  handoverNotes: string;
  /** noticeDate */
  noticeDate: string;
  /** noticeReason */
  noticeReason: string;
  /** settlementDate */
  settlementDate: string;
  /** settlementNotes */
  settlementNotes: string;
  /** tenancyActive */
  tenancyActive: boolean;
  /** viewingDate */
  viewingDate: string;
  /** rentalDocuments → RentalDocument[] */
  rentalDocuments: unknown[];
  /** property → Property */
  property: unknown;
  /** currentStage → RentalStage */
  currentStage: unknown;
  /** unit → Room */
  unit: unknown;
  /** tenant → Tenant */
  tenant: unknown;
  /** The entity's unique IRI. */
  iri: string;
}

// ── Dynamic form definition ───────────────────────────────────────────────

/** Pass to &lt;app-dynamic-entity-form [entity]="RentalEntity"&gt; */
export const RentalEntity: EntityInfo = {
  entityPath: 'rentals',
  predicatePath: 'rental',
  displayName: 'Rental',
  properties: [
    { name: 'damageConfirmed', type: 'Boolean', isCollection: false },
    { name: 'depositAmount', type: 'Decimal', isCollection: false },
    { name: 'depositPaid', type: 'Boolean', isCollection: false },
    { name: 'depositPaymentDate', type: 'String', isCollection: false },
    { name: 'depositReturned', type: 'Boolean', isCollection: false },
    { name: 'handbackDate', type: 'String', isCollection: false },
    { name: 'handbackNotes', type: 'String', isCollection: false },
    { name: 'handoverDate', type: 'String', isCollection: false },
    { name: 'handoverNotes', type: 'String', isCollection: false },
    { name: 'noticeDate', type: 'String', isCollection: false },
    { name: 'noticeReason', type: 'String', isCollection: false },
    { name: 'settlementDate', type: 'String', isCollection: false },
    { name: 'settlementNotes', type: 'String', isCollection: false },
    { name: 'tenancyActive', type: 'Boolean', isCollection: false },
    { name: 'viewingDate', type: 'String', isCollection: false },
    { name: 'rentalDocuments', type: 'EntityRef', isCollection: true, targetEntityPath: 'rental-documents' },
    { name: 'property', type: 'EntityRef', isCollection: false, targetEntityPath: 'properties' },
    { name: 'currentStage', type: 'EntityRef', isCollection: false, targetEntityPath: 'rental-stages' },
    { name: 'unit', type: 'EntityRef', isCollection: false, targetEntityPath: 'rooms' },
    { name: 'tenant', type: 'EntityRef', isCollection: false, targetEntityPath: 'tenants' },
  ],
};
