export { ShapeClientService } from './shape-client.service';
export { ShaclValidatorService } from './shacl-validator.service';
export { extractSchema } from './shape-schema';
export {
  JSON_NS,
  keyOfPath,
  localName,
} from './rdf';
export {
  PROPERTY_TYPE,
  ROOM_TYPE,
  PROPERTY_SHAPE_IRI,
  ROOM_SHAPE_IRI,
  RENTAL_APPLICATION_SHAPE_IRI,
  RENTAL_CONTRACT_SHAPE_IRI,
  RENTAL_DEPOSIT_SHAPE_IRI,
  RENTAL_HANDOVER_SHAPE_IRI,
  RENTAL_TENANCY_SHAPE_IRI,
  RENTAL_NOTICED_SHAPE_IRI,
  RENTAL_HANDBACK_SHAPE_IRI,
  RENTAL_TERMINATED_SHAPE_IRI,
} from './shape.model';
export type {
  ShapeInfo,
  ShapeViolation,
  KeyConstraint,
  ShapeSchema,
  ViewValidationResponse,
} from './shape.model';
