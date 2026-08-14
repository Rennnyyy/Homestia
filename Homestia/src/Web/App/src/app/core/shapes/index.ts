export { ShapeClientService } from './shape-client.service';
export { ShaclValidatorService } from './shacl-validator.service';
export { extractSchema } from './shape-schema';
export { buildDataGraph } from './value-to-graph';
export {
  HOMESTIA_NS,
  predicate,
  typeNode,
  keyOfPath,
  localName,
} from './rdf';
export {
  PROPERTY_TYPE,
  ROOM_TYPE,
  PROPERTY_SHAPE_IRI,
  ROOM_SHAPE_IRI,
} from './shape.model';
export type {
  ShapeInfo,
  ShapeViolation,
  KeyConstraint,
  ShapeSchema,
  ChildConfig,
  DataGraph,
} from './shape.model';
