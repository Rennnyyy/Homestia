import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ShaclValidatorService } from './shacl-validator.service';
import { ShapeClientService } from './shape-client.service';
import { SHAPE_FIXTURES } from './shape.fixtures';

const PROPERTY_SHAPE_IRI = 'urn:aletheia:homestia:shapes:property';
const PROPERTY_VALIDATE_URL = `/api/entities/aspect-definitions/${encodeURIComponent(PROPERTY_SHAPE_IRI)}/validate`;

describe('ShaclValidatorService', () => {
  let validator: ShaclValidatorService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    const fakeClient = {
      getShapeTtl: async (key: string) => SHAPE_FIXTURES[key],
    };

    TestBed.configureTestingModule({
      providers: [
        ShaclValidatorService,
        { provide: ShapeClientService, useValue: fakeClient },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    validator = TestBed.inject(ShaclValidatorService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('posts the form value to the backend validate endpoint', async () => {
    const value = { name: 'Homely House', address: 'Main Street 12' };

    const promise = validator.validate(PROPERTY_SHAPE_IRI, value);

    const request = httpMock.expectOne(PROPERTY_VALIDATE_URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(value);
    request.flush({ conforms: true, findings: [] });

    expect(await promise).toEqual([]);
  });

  it('returns the findings reported by the backend', async () => {
    const findings = [
      { jsonPath: 'name', key: 'name', message: 'shape.property.name', severity: 'Violation' },
      { jsonPath: 'rooms[0].roomSize', key: 'roomSize', message: 'shape.room.roomSize', severity: 'Violation' },
    ];

    const promise = validator.validate(PROPERTY_SHAPE_IRI, { name: '' });

    httpMock.expectOne(PROPERTY_VALIDATE_URL).flush({ conforms: false, findings });

    const violations = await promise;
    expect(violations).toEqual(findings);
    expect(violations.find((v) => v.jsonPath === 'rooms[0].roomSize')?.message).toBe(
      'shape.room.roomSize',
    );
  });

  it('forwards warnings and infos untouched', async () => {
    const findings = [
      { jsonPath: 'rentalModel', key: 'rentalModel', message: 'shape.property.rentalModel', severity: 'Warning' },
    ];

    const promise = validator.validate(PROPERTY_SHAPE_IRI, { name: 'House' });

    httpMock.expectOne(PROPERTY_VALIDATE_URL).flush({ conforms: false, findings });

    expect(await promise).toEqual(findings);
  });

  it('extracts the rendering schema locally from the served Turtle', async () => {
    const schema = await validator.loadSchema(PROPERTY_SHAPE_IRI);

    expect(schema.keys.map((k) => k.key)).toEqual([
      'name',
      'address',
      'propertyType',
      'rentalModel',
      'rooms',
    ]);
    expect(schema.targetClasses).toEqual(['urn:aletheia:homestia:Property']);
  });
});
