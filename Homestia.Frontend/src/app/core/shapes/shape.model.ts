/**
 * Homestia's shape vocabulary.
 *
 * The shape engine and its types now live in @rennnyyy/aletheia-core; this file
 * holds only the IRIs this program registers.
 */

/** Root entity type IRIs used by the Homestia shapes. */
export const PROPERTY_TYPE = 'urn:aletheia:homestia:Property';
export const ROOM_TYPE = 'urn:aletheia:homestia:Room';

/** Catalog IRIs of the Homestia shapes (served by the SDK exploration). */
export const PROPERTY_SHAPE_IRI = 'urn:aletheia:homestia:shapes:property';
export const ROOM_SHAPE_IRI = 'urn:aletheia:homestia:shapes:room';
export const TENANT_SHAPE_IRI = 'urn:aletheia:homestia:shapes:tenant';

/**
 * Catalog IRIs of the rental stage shapes. Each stage carries its own target
 * class (<c>urn:aletheia:homestia:Rental:&lt;stage&gt;</c>) so the backend view
 * engine validates a stage in isolation — the whole stage sequence gates the
 * rental lifecycle: stage N unlocks stage N+1.
 */
export const RENTAL_APPLICATION_SHAPE_IRI = 'urn:aletheia:homestia:shapes:rental:application';
export const RENTAL_CONTRACT_SHAPE_IRI = 'urn:aletheia:homestia:shapes:rental:contract';
export const RENTAL_DEPOSIT_SHAPE_IRI = 'urn:aletheia:homestia:shapes:rental:deposit';
export const RENTAL_HANDOVER_SHAPE_IRI = 'urn:aletheia:homestia:shapes:rental:handover';
export const RENTAL_TENANCY_SHAPE_IRI = 'urn:aletheia:homestia:shapes:rental:tenancy';
export const RENTAL_NOTICED_SHAPE_IRI = 'urn:aletheia:homestia:shapes:rental:noticed';
export const RENTAL_HANDBACK_SHAPE_IRI = 'urn:aletheia:homestia:shapes:rental:handback';
export const RENTAL_TERMINATED_SHAPE_IRI = 'urn:aletheia:homestia:shapes:rental:terminated';

/**
 * Operation aspects — the write-side counterparts of the views above, registered
 * by the Program and selected per write through
 * `X-Aletheia-Operation-AspectIri`.
 *
 * A view decides which fields a form *shows*; the operation aspect decides which
 * fields the write may *set*, and the server ignores every body field its shape
 * does not name. An aspect names ONE entity's writable surface — its shape's
 * `sh:targetClass` says which — so a save that writes two entity types selects two:
 *
 * - `PROPERTY_OPERATION_IRI` / `ROOM_OPERATION_IRI` — the property save and delete.
 *   The property is the parent and its rooms are the children, so the aggregate save
 *   passes both (`parentAspectIri` / `childAspectIri`).
 * - `TENANT_OPERATION_IRI` — the inline tenant quick-create.
 * - `RENTAL_<STAGE>_OPERATION_IRI` — one per rental lifecycle stage, selected by
 *   `rentalOperationIriFor()`. A stage save selects the aspect of the stage being
 *   saved, so the gate carries that stage's form fields *and* that stage's presence
 *   rules: a stage can no longer be persisted with its own required fields empty. One
 *   shared rental aspect could only carry the union of the eight stages, and a union
 *   presence rule would reject every save that does not mention another stage's fields.
 */
export const PROPERTY_OPERATION_IRI = 'urn:aletheia:homestia:operations:property';
export const ROOM_OPERATION_IRI = 'urn:aletheia:homestia:operations:room';
export const TENANT_OPERATION_IRI = 'urn:aletheia:homestia:operations:tenant';

export const RENTAL_APPLICATION_OPERATION_IRI = 'urn:aletheia:homestia:operations:rental:application';
export const RENTAL_CONTRACT_OPERATION_IRI = 'urn:aletheia:homestia:operations:rental:contract';
export const RENTAL_DEPOSIT_OPERATION_IRI = 'urn:aletheia:homestia:operations:rental:deposit';
export const RENTAL_HANDOVER_OPERATION_IRI = 'urn:aletheia:homestia:operations:rental:handover';
export const RENTAL_TENANCY_OPERATION_IRI = 'urn:aletheia:homestia:operations:rental:tenancy';
export const RENTAL_NOTICED_OPERATION_IRI = 'urn:aletheia:homestia:operations:rental:noticed';
export const RENTAL_HANDBACK_OPERATION_IRI = 'urn:aletheia:homestia:operations:rental:handback';
export const RENTAL_TERMINATED_OPERATION_IRI = 'urn:aletheia:homestia:operations:rental:terminated';

/** The eight rental lifecycle stage keys, in workflow order. */
export const RENTAL_STAGE_KEYS = [
  'application', 'contract', 'deposit', 'handover',
  'tenancy', 'noticed', 'handback', 'terminated',
] as const;
export type RentalStageKey = (typeof RENTAL_STAGE_KEYS)[number];

/**
 * The operation aspect governing a rental write at each stage, by stage key — the last
 * segment of the stage's view shape IRI and of its operation aspect IRI.
 */
export const RENTAL_OPERATION_IRI_BY_STAGE: Record<RentalStageKey, string> = {
  application: RENTAL_APPLICATION_OPERATION_IRI,
  contract: RENTAL_CONTRACT_OPERATION_IRI,
  deposit: RENTAL_DEPOSIT_OPERATION_IRI,
  handover: RENTAL_HANDOVER_OPERATION_IRI,
  tenancy: RENTAL_TENANCY_OPERATION_IRI,
  noticed: RENTAL_NOTICED_OPERATION_IRI,
  handback: RENTAL_HANDBACK_OPERATION_IRI,
  terminated: RENTAL_TERMINATED_OPERATION_IRI,
};

/**
 * The operation aspect governing a write that persists a rental stage — accepting either
 * the stage's stored reference (`…/rental-stages/<key>`, as `currentStage` carries it) or
 * a bare stage key.
 *
 * Falls back to the Application stage, where every rental starts, so a rental whose stage
 * is unknown still carries an aspect the backend can resolve: an aspect IRI that resolves
 * to nothing is refused outright (`400 UNKNOWN_OPERATION_ASPECT`) rather than run ungoverned.
 */
export function rentalOperationIriFor(stageIri?: string | null): string {
  const key = typeof stageIri === 'string' ? stageIri.split('/').pop() : undefined;
  const stage = RENTAL_STAGE_KEYS.find((candidate) => candidate === key);
  return stage ? RENTAL_OPERATION_IRI_BY_STAGE[stage] : RENTAL_APPLICATION_OPERATION_IRI;
}

/**
 * Query aspects — the read side. A read selects one through
 * `X-Aletheia-Query-AspectIri`; the aspect judges the returned record against the
 * same rules the operation aspect and the view carry, and merges any derived field
 * into the row.
 *
 * - `PROPERTY_QUERY_ASPECT_IRI` — the properties table.
 * - `ROOM_QUERY_ASPECT_IRI` — the rooms table and the property editor's room list.
 * - `TENANT_QUERY_ASPECT_IRI` — the tenants list and the rental tenant picker.
 * - `RENTAL_STATE_QUERY_ASPECT_IRI` — the rentals list; the backend merges the derived
 *   `state` field into every row.
 */
export const PROPERTY_QUERY_ASPECT_IRI = 'urn:aletheia:homestia:query:property';
export const ROOM_QUERY_ASPECT_IRI = 'urn:aletheia:homestia:query:room';
export const TENANT_QUERY_ASPECT_IRI = 'urn:aletheia:homestia:query:tenant';
export const RENTAL_STATE_QUERY_ASPECT_IRI = 'urn:aletheia:homestia:query:rental-state';
