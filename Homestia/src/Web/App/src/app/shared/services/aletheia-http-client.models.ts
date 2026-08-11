/**
 * Aletheia HTTP Client — shared models and types.
 *
 * These map to the Aletheia SDK's wire format for operations and capabilities.
 * Keep them minimal — the backend is the source of truth.
 */

// ── Operations (Entity CRUD) ──────────────────────────────────────────────

/** Wrapper returned by MapOperations list endpoints. */
export interface AletheiaCollection<T> {
  items: T[];
  totalCount?: number;
}

/** An entity reference — the SDK's wire format for EntityRef<T>. */
export interface AletheiaEntityRef {
  iri: string;
  displayValue?: string;
}

/** An entity reference collection — the SDK's wire format for EntityRefCollection<T>. */
export interface AletheiaEntityRefCollection {
  items: AletheiaEntityRef[];
}

/** Response from POST /api/entities/{path} — just the IRI of the created entity. */
export interface AletheiaCreatedResponse {
  iri: string;
}

/** Response from PUT /api/entities/{path}?iri=... — the IRI of the updated entity. */
export interface AletheiaUpdatedResponse {
  iri: string;
}

// ── Capabilities ──────────────────────────────────────────────────────────

/** Standard capability response envelope. */
export interface CapabilityResponse<T = unknown> {
  success: boolean;
  data?: T;
  errors?: CapabilityError[];
}

export interface CapabilityError {
  code: string;
  message: string;
}

// ── Objects ───────────────────────────────────────────────────────────────

export interface ObjectReference {
  id: string;
  url: string;
  contentType: string;
  size: number;
}

// ── Exploration — Real SDK wire types ─────────────────────────────────────

/** A single property of an entity, as returned by the SDK. */
export interface EntityPropertyDefinition {
  propertyName: string;
  predicate: string;
  clrType: string;
  isIdentityPart: boolean;
  identityPartOrder: number;
  isRequired: boolean;
}

/** A relation (owning or incoming) between entities. */
export interface EntityRelationDefinition {
  propertyName: string;
  predicate: string;
  relatedEntityDefinitionIri: string;
  relatedEntityName: string;
  relationKind: string;
  isCollection: boolean;
  isInferred: boolean;
}

/** Full entity definition from GET /api/entities/entity-definitions. */
export interface EntityDefinition {
  clrTypeIdentifier: string;
  name: string;
  clrNamespace: string;
  assemblyName: string;
  entityPath: string;
  predicatePath: string;
  iriPrefix: string;
  typeIri: string;
  definitionOrigin: string;
  isObjectBearing: boolean;
  identityStrategy: string;
  isEnumeration: boolean;
  properties: EntityPropertyDefinition[];
  owningRelations: EntityRelationDefinition[];
  incomingRelations: EntityRelationDefinition[];
  iri: string;
}

/** Capability definition from GET /api/entities/capability-definitions. */
export interface CapabilityDefinition {
  name: string;
  description: string;
  requestType: string;
  responseType: string;
  iri: string;
}

/** Aspect definition from GET /api/entities/aspect-definitions. */
export interface AspectDefinition {
  name: string;
  description: string;
  iri: string;
}

// ── Simplified form types (mapped from EntityDefinition) ──────────────────

/** Simplified entity info for dynamic-form consumption. */
export interface EntityInfo {
  /** The API URL path (e.g. "properties" from [OperationEndpoints]). Defaults to predicatePath if omitted. */
  entityPath?: string;
  /** The RDF predicate path (e.g. "property"). */
  predicatePath: string;
  /** Human-readable display name. */
  displayName: string;
  /** Properties to render in the dynamic form. */
  properties: EntityPropertyInfo[];
}

/** Simplified property info for dynamic-form consumption. */
export interface EntityPropertyInfo {
  name: string;
  type: string;
  isCollection: boolean;
  /** For EntityRef properties, the API path of the target entity (e.g. "property-types"). */
  targetEntityPath?: string;
}
