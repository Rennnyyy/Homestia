// Auto-generated from http://localhost:5000/api/entities/entity-definitions — do not edit manually.
// Entity: Tenant  |  predicatePath: "tenant"  |  enum: false

import type { EntityInfo } from '../shared/services/aletheia-http-client.models';

// ── API response interface ────────────────────────────────────────────────

export interface Tenant {
  /** email */
  email: string;
  /** phone */
  phone: string;
  /** The entity's unique IRI. */
  iri: string;
}

// ── Dynamic form definition ───────────────────────────────────────────────

/** Pass to &lt;app-dynamic-entity-form [entity]="TenantEntity"&gt; */
export const TenantEntity: EntityInfo = {
  entityPath: 'tenants',
  predicatePath: 'tenant',
  displayName: 'Tenant',
  properties: [
    { name: 'email', type: 'String', isCollection: false },
    { name: 'phone', type: 'String', isCollection: false },
  ],
};
