// Auto-generated from http://localhost:5000/api/entities/entity-definitions — do not edit manually.
// Entity: RentalModel  |  predicatePath: "rentalModel"  |  enum: true

import type { EntityInfo } from '../shared/services/aletheia-http-client.models';

// ── API response interface ────────────────────────────────────────────────

export interface RentalModel {
  /** key */
  key: string;
  /** displayName */
  displayName: string;
  /** The entity's unique IRI. */
  iri: string;
}

// ── Dynamic form definition ───────────────────────────────────────────────

/** Pass to &lt;app-dynamic-entity-form [entity]="RentalModelEntity"&gt; */
export const RentalModelEntity: EntityInfo = {
  entityPath: 'rental-models',
  predicatePath: 'rentalModel',
  displayName: 'RentalModel',
  properties: [
    { name: 'key', type: 'String', isCollection: false },
    { name: 'displayName', type: 'String', isCollection: false },
  ],
};
