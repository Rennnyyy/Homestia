import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Parser, Store } from 'n3';
import { ShapeClientService } from './shape-client.service';
import { extractSchema } from './shape-schema';
import type { ShapeSchema, ShapeViolation, ViewValidationResponse } from './shape.model';

/**
 * ShaclValidatorService — delegates form validation to the backend view
 * aspect engine. The Program owns the shapes; the browser sends the JSON
 * form value to POST /api/entities/aspect-definitions/{iri}/validate and
 * receives findings of every severity mapped to JSON paths.
 *
 * Schema extraction (field order, datatypes) still happens locally from the
 * served Turtle — it is rendering metadata, not judgment.
 */
@Injectable({ providedIn: 'root' })
export class ShaclValidatorService {
  private readonly client = inject(ShapeClientService);
  private readonly http = inject(HttpClient);

  /** Fetches and extracts the UI schema of one shape. */
  async loadSchema(shapeKey: string): Promise<ShapeSchema> {
    const ttl = await this.client.getShapeTtl(shapeKey);
    const dataset = new Store();
    dataset.addQuads(new Parser({ format: 'text/turtle' }).parse(ttl));
    return extractSchema(dataset, shapeKey);
  }

  /**
   * Validates one form value against the shape via the backend view engine.
   * Empty array = conforms. Findings carry JSON paths for nested values
   * (e.g. `rooms[0].roomSize`) and every severity (Violation/Warning/Info).
   */
  async validate(shapeKey: string, value: Record<string, unknown>): Promise<ShapeViolation[]> {
    const url = `/api/entities/aspect-definitions/${encodeURIComponent(shapeKey)}/validate`;
    const response = await firstValueFrom(this.http.post<ViewValidationResponse>(url, value));
    return response.findings ?? [];
  }
}

