// Auto-generated from http://localhost:5000/api/entities/entity-definitions — do not edit manually.
// Entity: Segmentation  |  predicatePath: "segmentations"  |  enum: false

import type { EntityInfo } from '../shared/services/aletheia-http-client.models';

// ── API response interface ────────────────────────────────────────────────

export interface Segmentations {
  /** isCommonArea */
  isCommonArea: boolean;
  /** name */
  name: string;
  /** isPartOf → Property */
  isPartOf: unknown;
  /** The entity's unique IRI. */
  iri: string;
}

// ── Dynamic form definition ───────────────────────────────────────────────

/** Pass to &lt;app-dynamic-entity-form [entity]="SegmentationsEntity"&gt; */
export const SegmentationsEntity: EntityInfo = {
  entityPath: 'segmentations',
  predicatePath: 'segmentations',
  displayName: 'Segmentation',
  properties: [
    { name: 'isCommonArea', type: 'Boolean', isCollection: false },
    { name: 'name', type: 'String', isCollection: false },
    { name: 'isPartOf', type: 'EntityRef', isCollection: false },
  ],
};
