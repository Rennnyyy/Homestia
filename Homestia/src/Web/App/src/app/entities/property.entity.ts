// Auto-generated from http://localhost:5001/api/entities/entity-definitions — do not edit manually.
// Entity: Property  |  predicatePath: "property"  |  enum: false

import type { EntityInfo } from '../shared/services/aletheia-http-client.models';

// ── API response interface ────────────────────────────────────────────────

export interface Property {
  /** address */
  address: string;
  /** isPartOf → Property */
  isPartOf: unknown;
  /** propertyType → PropertyType */
  propertyType: unknown;
  /** rentalModel → RentalModel */
  rentalModel: unknown;
  /** The entity's unique IRI. */
  iri: string;
  /** Inherited — inferred from API response. */
  segmentedInto: string | null[];
  /** Inherited — inferred from API response. */
  name: string;
  /** Inherited — inferred from API response. */
  isCommonArea: boolean;
}

// ── Dynamic form definition ───────────────────────────────────────────────

/** Pass to &lt;app-dynamic-entity-form [entity]="PropertyEntity"&gt; */
export const PropertyEntity: EntityInfo = {
  entityPath: 'properties',
  predicatePath: 'property',
  displayName: 'Property',
  properties: [
    { name: 'address', type: 'String', isCollection: false },
    { name: 'isPartOf', type: 'EntityRef', isCollection: false },
    { name: 'propertyType', type: 'EntityRef', isCollection: false },
    { name: 'rentalModel', type: 'EntityRef', isCollection: false },
    { name: 'segmentedInto', type: 'EntityRef', isCollection: true },
    { name: 'name', type: 'String', isCollection: false },
    { name: 'isCommonArea', type: 'Boolean', isCollection: false },
  ],
};
