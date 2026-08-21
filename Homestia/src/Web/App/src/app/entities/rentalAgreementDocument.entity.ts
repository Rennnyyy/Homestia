// Auto-generated from http://localhost:5001/api/entities/entity-definitions — do not edit manually.
// Entity: RentalAgreementDocument  |  predicatePath: "rentalAgreementDocument"  |  enum: false

import type { EntityInfo } from '../shared/services/aletheia-http-client.models';

// ── API response interface ────────────────────────────────────────────────

export interface RentalAgreementDocument {
  /** description */
  description: string;
  /** The entity's unique IRI. */
  iri: string;
}

// ── Dynamic form definition ───────────────────────────────────────────────

/** Pass to &lt;app-dynamic-entity-form [entity]="RentalAgreementDocumentEntity"&gt; */
export const RentalAgreementDocumentEntity: EntityInfo = {
  entityPath: 'rental-agreement-documents',
  predicatePath: 'rentalAgreementDocument',
  displayName: 'RentalAgreementDocument',
  properties: [
    { name: 'description', type: 'String', isCollection: false },
  ],
};
