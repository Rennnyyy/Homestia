import { describe, it, expect } from 'vitest';
import { Parser, Store } from 'n3';
import { extractSchema } from './shape-schema';
import { buildDataGraph } from './value-to-graph';
import { ROOM_TTL, PROPERTY_TTL } from './shape.fixtures';
import { HOMESTIA_NS } from './rdf';

function constraintsFor(ttl: string, shapeIri: string) {
  const parser = new Parser({ format: 'text/turtle' });
  const schema = extractSchema(new Store(parser.parse(ttl)), shapeIri);
  return new Map(schema.keys.map((k) => [k.key, k]));
}

const propertyConstraints = constraintsFor(PROPERTY_TTL, 'urn:aletheia:homestia:shapes:property');
const roomConstraints = constraintsFor(ROOM_TTL, 'urn:aletheia:homestia:shapes:room');
const allConstraints = new Map([...propertyConstraints, ...roomConstraints]);

describe('buildDataGraph', () => {
  it('types the root node with the root class', () => {
    const graph = buildDataGraph({ name: 'A', address: 'B' }, 'urn:aletheia:homestia:Property', allConstraints);

    const typeQuad = graph.quads.find(
      (q) => q.subject.equals(graph.focusNode) && q.predicate.value.endsWith('#type'),
    );
    expect(typeQuad?.object.value).toBe('urn:aletheia:homestia:Property');
  });

  it('skips empty IRI references so optional references stay absent', () => {
    const graph = buildDataGraph(
      { name: 'A', address: 'Main Street', propertyType: '', rentalModel: '' },
      'urn:aletheia:homestia:Property',
      allConstraints,
    );

    const rentalQuads = graph.quads.filter((q) => q.predicate.value === HOMESTIA_NS + 'rentalModel');
    expect(rentalQuads).toHaveLength(0);
  });

  it('emits non-empty IRI references as named nodes', () => {
    const graph = buildDataGraph(
      { name: 'A', address: 'Main Street', propertyType: 'urn:types:apartment' },
      'urn:aletheia:homestia:Property',
      allConstraints,
    );

    const quad = graph.quads.find((q) => q.predicate.value === HOMESTIA_NS + 'propertyType');
    expect(quad?.object.termType).toBe('NamedNode');
    expect(quad?.object.value).toBe('urn:types:apartment');
  });

  it('types numbers with the declared datatype', () => {
    const graph = buildDataGraph({ roomSize: 12.5 }, 'urn:aletheia:homestia:Room', allConstraints);

    const quad = graph.quads.find((q) => q.predicate.value === HOMESTIA_NS + 'roomSize');
    expect(quad?.object.termType).toBe('Literal');
    expect((quad?.object as { datatype?: { value: string } }).datatype?.value).toBe(
      'http://www.w3.org/2001/XMLSchema#decimal',
    );
    expect(quad?.object.value).toBe('12.5');
  });

  it('tracks nested children in the path map for violation reporting', () => {
    const graph = buildDataGraph(
      {
        name: 'Homely House',
        address: 'Main Street 12',
        propertyType: 'urn:types:apartment',
        rooms: [
          { name: 'Bedroom', roomSize: 14 },
          { name: 'Bath', roomSize: 6 },
        ],
      },
      'urn:aletheia:homestia:Property',
      allConstraints,
      [{ key: 'rooms', type: 'urn:aletheia:homestia:Room' }],
    );

    const roomNodes = graph.quads
      .filter((q) => q.predicate.value === HOMESTIA_NS + 'rooms')
      .map((q) => q.object.value);
    expect(roomNodes).toHaveLength(2);

    const paths = [...graph.pathMap.values()].filter((p) => p.startsWith('rooms'));
    expect(paths).toHaveLength(2);
    expect(paths).toContain('rooms[0]');
    expect(paths).toContain('rooms[1]');
  });

  it('keeps empty xsd:string values so minLength can report them', () => {
    const graph = buildDataGraph({ name: '' }, 'urn:aletheia:homestia:Room', allConstraints);

    const quad = graph.quads.find((q) => q.predicate.value === HOMESTIA_NS + 'name');
    expect(quad?.object.termType).toBe('Literal');
    expect(quad?.object.value).toBe('');
  });
});
