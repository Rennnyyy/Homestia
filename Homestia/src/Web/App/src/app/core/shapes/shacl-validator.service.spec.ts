import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { ShaclValidatorService } from './shacl-validator.service';
import { ShapeClientService } from './shape-client.service';
import { SHAPE_FIXTURES } from './shape.fixtures';

const PROPERTY_SHAPE_IRI = 'urn:aletheia:homestia:shapes:property';
const ROOM_SHAPE_IRI = 'urn:aletheia:homestia:shapes:room';

describe('ShaclValidatorService', () => {
  let validator: ShaclValidatorService;

  beforeEach(() => {
    const fakeClient = {
      getShapeTtl: async (key: string) => SHAPE_FIXTURES[key],
    };

    TestBed.configureTestingModule({
      providers: [
        ShaclValidatorService,
        { provide: ShapeClientService, useValue: fakeClient },
      ],
    });
    validator = TestBed.inject(ShaclValidatorService);
  });

  it('rejects a property with an empty name', async () => {
    const violations = await validator.validate(PROPERTY_SHAPE_IRI, {
      name: '',
      address: 'Main Street 12',
      propertyType: 'urn:types:apartment',
    });

    const nameViolation = violations.find((v) => v.jsonPath === 'name');
    expect(nameViolation?.message).toBe('shape.property.name');
  });

  it('rejects a property without a property type', async () => {
    const violations = await validator.validate(PROPERTY_SHAPE_IRI, {
      name: 'Homely House',
      address: 'Main Street 12',
      propertyType: '',
    });

    const typeViolation = violations.find((v) => v.jsonPath === 'propertyType');
    expect(typeViolation?.message).toBe('shape.property.propertyType');
  });

  it('accepts a conforming property', async () => {
    const violations = await validator.validate(PROPERTY_SHAPE_IRI, {
      name: 'Homely House',
      address: 'Main Street 12',
      propertyType: 'urn:types:apartment',
      rentalModel: '',
    });

    expect(violations).toHaveLength(0);
  });

  it('rejects a room with a size outside the declared range', async () => {
    const violations = await validator.validate(ROOM_SHAPE_IRI, {
      name: 'Bedroom',
      location: '',
      roomSize: 2500,
    });

    const sizeViolation = violations.find((v) => v.jsonPath === 'roomSize');
    expect(sizeViolation?.message).toBe('shape.room.roomSize');
  });

  it('validates property and rooms as one composite graph', async () => {
    const violations = await validator.validateComposite(
      PROPERTY_SHAPE_IRI,
      { name: 'Homely House', address: 'Main Street 12', propertyType: 'urn:types:apartment' },
      {
        shapeKey: ROOM_SHAPE_IRI,
        config: { key: 'rooms' },
        values: [{ name: '', location: '', roomSize: 14, furnishingStatus: '', roomStatus: '' }],
      },
    );

    expect(violations.find((v) => v.jsonPath === 'rooms[0].name')?.message).toBe(
      'shape.room.name',
    );
  });

  it('accepts a valid composite with multiple rooms', async () => {
    const violations = await validator.validateComposite(
      PROPERTY_SHAPE_IRI,
      { name: 'Homely House', address: 'Main Street 12', propertyType: 'urn:types:apartment' },
      {
        shapeKey: ROOM_SHAPE_IRI,
        config: { key: 'rooms' },
        values: [
          { name: 'Bedroom', roomSize: 14 },
          { name: 'Bath', roomSize: 6 },
        ],
      },
    );

    expect(violations).toHaveLength(0);
  });

  it('accepts a valid property with no rooms', async () => {
    const violations = await validator.validateComposite(
      PROPERTY_SHAPE_IRI,
      { name: 'Homely House', address: 'Main Street 12', propertyType: 'urn:types:apartment' },
      { shapeKey: ROOM_SHAPE_IRI, config: { key: 'rooms' }, values: [] },
    );

    expect(violations).toHaveLength(0);
  });
});
