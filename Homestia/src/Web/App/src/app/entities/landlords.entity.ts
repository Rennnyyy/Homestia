// Auto-generated from http://localhost:5001/api/entities/entity-definitions — do not edit manually.
// Entity: Landlord  |  predicatePath: "landlords"  |  enum: false

import type { EntityInfo } from '../shared/services/aletheia-http-client.models';

// ── API response interface ────────────────────────────────────────────────

export interface Landlords {
  /** representedBy → Agent */
  agent: unknown;
  /** owns → Property */
  properties: unknown[];
  /** landlordType → PropertyType */
  landlordType: unknown;
  /** The entity's unique IRI. */
  iri: string;
}

// ── Dynamic form definition ───────────────────────────────────────────────

/** Pass to &lt;app-dynamic-entity-form [entity]="LandlordsEntity"&gt; */
export const LandlordsEntity: EntityInfo = {
  entityPath: 'landlords',
  predicatePath: 'landlords',
  displayName: 'Landlord',
  properties: [
    { name: 'agent', type: 'EntityRef', isCollection: false },
    { name: 'properties', type: 'EntityRef', isCollection: true },
    { name: 'landlordType', type: 'EntityRef', isCollection: false },
  ],
};
