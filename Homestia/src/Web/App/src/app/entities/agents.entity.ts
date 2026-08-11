// Auto-generated from http://localhost:5000/api/entities/entity-definitions — do not edit manually.
// Entity: Agent  |  predicatePath: "agents"  |  enum: false

import type { EntityInfo } from '../shared/services/aletheia-http-client.models';

// ── API response interface ────────────────────────────────────────────────

export interface Agents {
  /** displayName */
  displayName: string;
  /** The entity's unique IRI. */
  iri: string;
}

// ── Dynamic form definition ───────────────────────────────────────────────

/** Pass to &lt;app-dynamic-entity-form [entity]="AgentsEntity"&gt; */
export const AgentsEntity: EntityInfo = {
  entityPath: 'agents',
  predicatePath: 'agents',
  displayName: 'Agent',
  properties: [
    { name: 'displayName', type: 'String', isCollection: false },
  ],
};
