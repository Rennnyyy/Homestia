/** Capability descriptors & execution types — generated from backend introspection. Do not edit. */
// Identity, route, HTTP verb and type names are generated today. Command/
// response payloads become fully typed when capability shapes land on the
// definition surface; until then they fall back to
// Record<string, unknown>. The generator never parses TTL/SPARQL.

/** Stable capability identities, in backend declaration order — generated. Do not edit. */
export const CAPABILITY_IDS = ['program.greet'] as const;

/** program.greet — ProgramGreet descriptor, command payload and result types. */

/** Capability descriptor for program.greet — generated. Do not edit. */
export const ProgramGreet = {
  capabilityIdentity: 'program.greet',
  routePath: 'api/capabilities/program/greet',
  httpMethod: 'POST',
  commandTypeName: 'GreetCommand',
  responseTypeName: 'GreetResponse',
} as const;

/** command payload for the program.greet capability — generated. Do not edit. */
export type ProgramGreetCommand = Record<string, unknown>;

/** command result for the program.greet capability — generated. Do not edit. */
export type ProgramGreetResponse = Record<string, unknown>;

/** Identity → capability descriptor lookup — generated. Do not edit. */
export const CAPABILITY_META = {
  'program.greet': ProgramGreet,
} as const;
