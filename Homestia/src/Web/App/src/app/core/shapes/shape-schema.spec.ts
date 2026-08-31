import { Parser, Store } from 'n3';
import { describe, it, expect } from 'vitest';
import { extractSchema } from './shape-schema';
import { PROPERTY_TTL, ROOM_TTL } from './shape.fixtures';

function datasetFor(ttl: string): Store {
  const parser = new Parser({ format: 'text/turtle' });
  return new Store(parser.parse(ttl));
}

describe('extractSchema', () => {
  it('extracts ordered JSON keys from sh:property declarations', () => {
    const schema = extractSchema(datasetFor(PROPERTY_TTL), 'urn:aletheia:homestia:shapes:property');

    expect(schema.keys.map((k) => k.key)).toEqual([
      'name',
      'address',
      'propertyType',
      'rentalModel',
      'rooms',
    ]);
  });

  it('resolves target classes', () => {
    const schema = extractSchema(datasetFor(ROOM_TTL), 'urn:aletheia:homestia:shapes:room');

    expect(schema.targetClasses).toEqual(['urn:aletheia:homestia:Room']);
  });

  it('reads datatype and nodeKind per key', () => {
    const schema = extractSchema(datasetFor(ROOM_TTL), 'urn:aletheia:homestia:shapes:room');

    expect(schema.keyByName.get('roomSize')?.datatype).toBe(
      'http://www.w3.org/2001/XMLSchema#decimal',
    );
    expect(schema.keyByName.get('furnishingStatus')?.nodeKind).toBe('IRI');
    expect(schema.keyByName.get('name')?.datatype).toBe('http://www.w3.org/2001/XMLSchema#string');
  });

  it('ignores paths outside the canonical JSON namespace', () => {
    const ttl = `
      @prefix sh: <http://www.w3.org/ns/shacl#> .
      <urn:test:shape>
          a sh:NodeShape ;
          sh:property [ sh:path <urn:test:foreign> ; sh:order 1 ] ;
          sh:property [ sh:path <https://aletheia.katharsis.digital/json/name> ; sh:order 2 ] .
    `;
    const parser = new Parser({ format: 'text/turtle' });
    const schema = extractSchema(new Store(parser.parse(ttl)), 'urn:test:shape');

    expect(schema.keys.map((k) => k.key)).toEqual(['name']);
  });

  it('reads sh:description as field visual help (null when absent)', () => {
    const ttl = `
      @prefix sh: <http://www.w3.org/ns/shacl#> .
      <urn:test:shape>
          a sh:NodeShape ;
          sh:property [
              sh:path <https://aletheia.katharsis.digital/json/name> ; sh:order 1 ;
              sh:description "A short human-readable name." ;
          ] .
    `;
    const parser = new Parser({ format: 'text/turtle' });
    const schema = extractSchema(new Store(parser.parse(ttl)), 'urn:test:shape');

    expect(schema.keyByName.get('name')?.description).toBe('A short human-readable name.');
  });

  it('leaves description null when the shape declares none', () => {
    const schema = extractSchema(datasetFor(ROOM_TTL), 'urn:aletheia:homestia:shapes:room');

    expect(schema.keyByName.get('roomSize')?.description).toBeNull();
  });
});
