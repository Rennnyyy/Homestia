/** Entity type for Rental — generated from backend introspection. Do not edit. */
export interface Rental {
  /** The record's IRI — the identity every route is called with. */
  iri: string;
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
  /** property (EntityRef → Property) */
  property: unknown;
  /** rentalDocuments (EntityRef → RentalDocument) */
  rentalDocuments: unknown[];
  /** currentStage (EntityRef → RentalStage) */
  currentStage: unknown;
  /** unit (EntityRef → Room) */
  unit: unknown;
  /** tenant (EntityRef → Tenant) */
  tenant: unknown;
}
