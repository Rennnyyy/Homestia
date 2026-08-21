// Auto-generated from http://localhost:5001/api/entities/entity-definitions — do not edit manually.
// Entity: Agent  |  predicatePath: "agents"  |  enum: false

import type { EntityInfo } from '../shared/services/aletheia-http-client.models';

// ── API response interface ────────────────────────────────────────────────

export interface Agents {
  /** address */
  address: string;
  /** birthday */
  birthday: unknown;
  /** email */
  email: string;
  /** firstName */
  firstName: string;
  /** lastName */
  lastName: string;
  /** nickname */
  nickname: string;
  /** phoneNumber */
  phoneNumber: string;
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
    { name: 'address', type: 'String', isCollection: false },
    { name: 'birthday', type: 'DateOnly', isCollection: false },
    { name: 'email', type: 'String', isCollection: false },
    { name: 'firstName', type: 'String', isCollection: false },
    { name: 'lastName', type: 'String', isCollection: false },
    { name: 'nickname', type: 'String', isCollection: false },
    { name: 'phoneNumber', type: 'String', isCollection: false },
  ],
};
