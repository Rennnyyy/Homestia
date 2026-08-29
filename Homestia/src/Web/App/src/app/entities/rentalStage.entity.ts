// Auto-generated from http://localhost:5000/api/entities/entity-definitions — do not edit manually.
// Entity: RentalStage  |  predicatePath: "rentalStage"  |  enum: true

import type { EntityInfo } from '../shared/services/aletheia-http-client.models';

// ── API response interface ────────────────────────────────────────────────

export interface RentalStage {
  /** key */
  key: string;
  /** displayName */
  displayName: string;
  /** The entity's unique IRI. */
  iri: string;
}

// ── Dynamic form definition ───────────────────────────────────────────────

/** Pass to &lt;app-dynamic-entity-form [entity]="RentalStageEntity"&gt; */
export const RentalStageEntity: EntityInfo = {
  entityPath: 'rental-stages',
  predicatePath: 'rentalStage',
  displayName: 'RentalStage',
  properties: [
    { name: 'key', type: 'String', isCollection: false },
    { name: 'displayName', type: 'String', isCollection: false },
  ],
};
