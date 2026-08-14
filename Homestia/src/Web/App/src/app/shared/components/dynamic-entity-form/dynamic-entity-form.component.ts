import {
  Component,
  input,
  output,
  inject,
  computed,
  signal,
  effect,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { lastValueFrom } from 'rxjs';
import { AletheiaHttpClient } from '../../services/aletheia-http-client';
import { ShaclValidatorService } from '../../../core/shapes';
import type { ShapeViolation } from '../../../core/shapes';
import {
  FieldRendererRegistry,
  FieldRendererConfig,
} from './field-renderer-registry.service';
import type { EntityInfo, EntityPropertyInfo } from '../../services/aletheia-http-client.models';

/**
 * DynamicEntityForm — renders form fields for a single Aletheia entity
 * definition. No chrome — embed inside a card, dialog, or inline.
 */
@Component({
  selector: 'app-dynamic-entity-form',
  standalone: true,
  imports: [FormsModule, TranslocoPipe],
  templateUrl: './dynamic-entity-form.component.html',
  styleUrl: './dynamic-entity-form.component.scss',
})
export class DynamicEntityFormComponent {
  private readonly registry = inject(FieldRendererRegistry);
  private readonly aletheia = inject(AletheiaHttpClient);
  private readonly validator = inject(ShaclValidatorService);

  // ── Option caching for EntityRef dropdowns ─────────────────────────────

  /** Cached options per entity path. { iri, displayValue } arrays. */
  private readonly optionsCache = new Map<string, { iri: string; displayValue: string }[]>();
  private readonly optionsLoading = signal<Set<string>>(new Set());

  /** Public signal for template consumption: path → options array. */
  readonly options = signal<Map<string, { iri: string; displayValue: string }[]>>(new Map());

  // ── Inputs ──────────────────────────────────────────────────────────────

  /** The entity definition (from AletheiaModelService). */
  readonly entity = input.required<EntityInfo>();

  /** Display mode. */
  readonly mode = input.required<'view' | 'edit' | 'create'>();

  /** Current entity data (null / empty object for create). */
  readonly value = input<Record<string, unknown> | null>(null);

  /** Optional: subset of property names to show, in display order. */
  readonly fieldNames = input<string[] | null>(null);

  /** Optional: frontend shape key — drives field order and SHACL validation. */
  readonly shapeKey = input<string | null>(null);

  /** External violations targeting this form (scoped by the parent). */
  readonly violations = input<ShapeViolation[]>([]);

  // ── Outputs ─────────────────────────────────────────────────────────────

  readonly saved = output<Record<string, unknown>>();
  readonly cancelled = output<void>();

  // ── Internal state ──────────────────────────────────────────────────────

  /** Local mutable copy of the form data (two-way bound). */
  readonly formData = signal<Record<string, unknown>>({});

  /** Per-field SHACL violations from this form's own save, keyed by JSON key. */
  readonly fieldErrors = signal<Record<string, string>>({});

  /** External per-field violations (composite validation), keyed by JSON key. */
  readonly externalFieldErrors = computed<Record<string, string>>(() => {
    const errors: Record<string, string> = {};
    for (const violation of this.violations()) {
      if (violation.key && !violation.jsonPath.includes('.')) {
        errors[violation.key] = violation.message;
      }
    }
    return errors;
  });

  /** True while the SHACL engine is running. */
  readonly validating = signal(false);

  /** Shape-driven JSON keys in display order (null = no shape / not loaded). */
  private readonly shapeKeys = signal<string[] | null>(null);

  // ── Derived ─────────────────────────────────────────────────────────────

  /** Properties to display — filtered by fieldNames or the shape's keys. */
  readonly visibleProperties = computed<EntityPropertyInfo[]>(() => {
    const props = this.entity().properties;
    const names = this.fieldNames();
    const shapeKeys = this.shapeKeys();
    let filtered = this.mode() === 'create'
      ? props.filter((p) => p.name !== '@id')
      : props;

    if (names && names.length > 0) {
      const map = new Map(filtered.map((p) => [p.name, p]));
      filtered = names.map((n) => map.get(n)).filter((p): p is EntityPropertyInfo => !!p);
    } else if (shapeKeys && shapeKeys.length > 0) {
      // Keys absent from the shape are not rendered — the shape IS the form.
      const map = new Map(filtered.map((p) => [p.name, p]));
      filtered = shapeKeys.map((n) => map.get(n)).filter((p): p is EntityPropertyInfo => !!p);
    }

    return filtered;
  });

  readonly isView = computed(() => this.mode() === 'view');
  readonly isEdit = computed(() => this.mode() === 'edit');
  readonly isCreate = computed(() => this.mode() === 'create');
  readonly isEditable = computed(() => this.mode() !== 'view');

  // ── Lifecycle ───────────────────────────────────────────────────────────

  constructor() {
    // Sync local formData whenever entity, value, or mode changes.
    effect(() => {
      const data = this.value();
      const m = this.mode();
      const entityDef = this.entity();

      if (m === 'create') {
        const init: Record<string, unknown> = {};
        for (const p of entityDef.properties) {
          if (p.name === '@id') continue;
          init[p.name] = this.defaultForType(p);
        }
        this.formData.set(init);
      } else if (data) {
        // Edit / view: work directly on the source object so that two-way
        // bound mutations flow back to the parent (e.g. room forms in accordions).
        this.formData.set(data);
      } else {
        this.formData.set({});
      }
    });

    // Auto-load options for EntityRef properties
    effect(() => {
      const props = this.visibleProperties();
      for (const p of props) {
        if (p.type === 'EntityRef' && p.targetEntityPath && !this.optionsCache.has(p.targetEntityPath)) {
          this.loadOptions(p.targetEntityPath);
        }
      }
    });

    // Load the shape schema once when a shape key is provided.
    effect(() => {
      const key = this.shapeKey();
      if (!key) {
        this.shapeKeys.set(null);
        return;
      }
      this.validator.loadSchema(key)
        .then((schema) => this.shapeKeys.set(schema.keys.map((k) => k.key)))
        .catch(() => this.shapeKeys.set(null));
    });
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /** Resolve the renderer config for a property. */
  rendererFor(prop: EntityPropertyInfo): FieldRendererConfig {
    return this.registry.resolve(prop);
  }

  /** Compute the i18n label key for a property. */
  labelKey(prop: EntityPropertyInfo): string {
    return `fields.${this.entity().predicatePath}.${prop.name}`;
  }

  /** Track-by for @for loops. */
  trackByName(_: number, prop: EntityPropertyInfo): string {
    return prop.name;
  }

  /** Get the dropdown options for an EntityRef property. */
  optionsFor(prop: EntityPropertyInfo): { iri: string; displayValue: string }[] {
    if (!prop.targetEntityPath) return [];
    // Read from the signal to make this template-reactive
    const map = this.options();
    return map.get(prop.targetEntityPath) ?? [];
  }

  private async loadOptions(entityPath: string): Promise<void> {
    if (this.optionsCache.has(entityPath)) return;

    const loading = this.optionsLoading();
    if (loading.has(entityPath)) return;

    loading.add(entityPath);
    this.optionsLoading.set(new Set(loading));

    try {
      const res = await lastValueFrom(this.aletheia.list<{ key?: string; displayName?: string; iri?: string }>(entityPath));
      const items = (res.items ?? []).map((item) => ({
        iri: item.iri ?? '',
        displayValue: item.displayName ?? item.key ?? '',
      }));
      this.optionsCache.set(entityPath, items);
    } finally {
      loading.delete(entityPath);
      this.optionsLoading.set(new Set(loading));
      // Trigger signal update
      this.options.set(new Map(this.optionsCache));
    }
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  /**
   * Validates against the shape (when provided) and emits `saved` only when
   * the value conforms. Returns true when the save went through.
   */
  async save(): Promise<boolean> {
    const key = this.shapeKey();
    if (!key || this.isView()) {
      this.saved.emit({ ...this.formData() });
      return true;
    }

    this.validating.set(true);
    try {
      const violations = await this.validator.validate(key, this.formData());
      if (violations.length > 0) {
        const errors: Record<string, string> = {};
        for (const violation of violations) {
          if (violation.key && !violation.jsonPath.includes('.')) {
            errors[violation.key] = violation.message;
          }
        }
        this.fieldErrors.set(errors);
        return false;
      }

      this.fieldErrors.set({});
      this.saved.emit({ ...this.formData() });
      return true;
    } finally {
      this.validating.set(false);
    }
  }

  cancel(): void {
    this.cancelled.emit();
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private defaultForType(prop: EntityPropertyInfo): unknown {
    if (prop.isCollection) return [];
    switch (prop.type) {
      case 'Boolean': return false;
      case 'Decimal':
      case 'Int32':
      case 'Int64': return null;
      default: return '';
    }
  }
}
