// Auto-generated from http://localhost:5001/api/entities/entity-definitions — do not edit manually.
// Entity: Tenant  |  predicatePath: "tenants"  |  enum: false

import type { EntityInfo } from '../shared/services/aletheia-http-client.models';

// ── API response interface ────────────────────────────────────────────────

export interface Tenants {
  /** extends → Agent */
  agent: unknown;
  /** The entity's unique IRI. */
  iri: string;
}

// ── Dynamic form definition ───────────────────────────────────────────────

/** Pass to &lt;app-dynamic-entity-form [entity]="TenantsEntity"&gt; */
export const TenantsEntity: EntityInfo = {
  entityPath: 'tenants',
  predicatePath: 'tenants',
  displayName: 'Tenant',
  properties: [
    { name: 'agent', type: 'EntityRef', isCollection: false, targetEntityPath: 'agents' },
  ],
};
