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
 * does not name. Every save therefore selects the aspect covering the aggregate it
 * writes:
 *
 * - `PROPERTY_OPERATION_IRI` — the property save and the property delete. It
 *   covers the rooms too, because one save writes both.
 * - `TENANT_OPERATION_IRI` — the inline tenant quick-create.
 * - `RENTAL_OPERATION_IRI` — every rental stage save, all eight stages in one
 *   aspect: a stage save PUTs the whole record, so a per-stage aspect would erase
 *   the stages already filled.
 */
export const PROPERTY_OPERATION_IRI = 'urn:aletheia:homestia:operations:property';
export const TENANT_OPERATION_IRI = 'urn:aletheia:homestia:operations:tenant';
export const RENTAL_OPERATION_IRI = 'urn:aletheia:homestia:operations:rental';

/**
 * The one query aspect: the rentals list reads under it and the backend merges
 * the derived `state` field into every row. A query aspect gates and enriches a
 * read; it does not restrict which fields come back.
 */
export const RENTAL_STATE_QUERY_ASPECT_IRI = 'urn:aletheia:homestia:query:rental-state';
