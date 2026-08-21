// Auto-generated from http://localhost:5001/api/entities/entity-definitions — do not edit manually.
// Entity: Property  |  predicatePath: "property"  |  enum: false

import type { EntityInfo } from '../shared/services/aletheia-http-client.models';

// ── API response interface ────────────────────────────────────────────────

export interface Property {
  /** address */
  address: string;
  /** ownedBy → Landlord */
  ownedBy: unknown;
  /** isPartOf → Property */
  isPartOf: unknown;
  /** propertyType → PropertyType */
  propertyType: unknown;
  /** rentalModel → RentalModel */
  rentalModel: unknown;
  /** The entity's unique IRI. */
  iri: string;
  /** Inherited — resolved from entity hierarchy. */
  isCommonArea: boolean;
  /** Inherited — resolved from entity hierarchy. */
  name: string;
}

// ── Dynamic form definition ───────────────────────────────────────────────

/** Pass to &lt;app-dynamic-entity-form [entity]="PropertyEntity"&gt; */
export const PropertyEntity: EntityInfo = {
  entityPath: 'properties',
  predicatePath: 'property',
  displayName: 'Property',
  properties: [
    { name: 'address', type: 'String', isCollection: false },
    { name: 'ownedBy', type: 'EntityRef', isCollection: false, targetEntityPath: 'landlords' },
    { name: 'isPartOf', type: 'EntityRef', isCollection: false, targetEntityPath: 'properties' },
    { name: 'propertyType', type: 'EntityRef', isCollection: false, targetEntityPath: 'property-types' },
    { name: 'rentalModel', type: 'EntityRef', isCollection: false, targetEntityPath: 'rental-models' },
    { name: 'isCommonArea', type: 'Boolean', isCollection: false },
    { name: 'name', type: 'String', isCollection: false },
  ],
};
