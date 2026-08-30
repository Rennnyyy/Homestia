import {
  Component,
  input,
  output,
  inject,
  computed,
  signal,
  effect,
  TemplateRef,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideArrowUpRight } from '@lucide/angular';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { ShaclValidatorService } from '../../../core/shapes';
import type { ShapeSchema, ShapeViolation } from '../../../core/shapes';
import { EntityRefSelectComponent } from '../entity-ref-select/entity-ref-select.component';
import {
  FieldRendererRegistry,
  FieldRendererConfig,
} from './field-renderer-registry.service';
import type { EntityInfo, EntityPropertyInfo } from '../../services/aletheia-http-client.models';

/** Query params for a manage navigation (create/edit). */
export type ManageQueryParams = Record<string, unknown>;

/**
 * Generic "New / Edit" manage configuration for one entity type. Keyed by the
 * EntityRef target path, so any EntityRef field that selects that entity gets
 * the same jump buttons without per-field templates.
 */
export interface EntityManageConfig {
  /** Router path that manages this entity type (e.g. '/properties'). */
  route: string;
  /** Builds query params for creating a new entity; parentIri = the cascading parent value. */
  create?: (parentIri?: string) => ManageQueryParams | null;
  /** Builds query params for editing the selected entity; parentIri = the cascading parent value. */
  edit?: (iri: string, parentIri?: string) => ManageQueryParams | null;
}

/**
 * DynamicEntityForm — renders form fields for a single Aletheia entity
 * definition. No chrome — embed inside a card, dialog, or inline.
 */
@Component({
  selector: 'app-dynamic-entity-form',
  standalone: true,
  imports: [FormsModule, TranslocoPipe, EntityRefSelectComponent, NgTemplateOutlet, RouterLink, LucideArrowUpRight],
  templateUrl: './dynamic-entity-form.component.html',
  styleUrl: './dynamic-entity-form.component.scss',
})
export class DynamicEntityFormComponent {
  private readonly registry = inject(FieldRendererRegistry);
  private readonly validator = inject(ShaclValidatorService);

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

  /**
   * Configures inline "create new" actions on EntityRef fields, keyed by
   * property name — e.g. <c>{ tenant: { labelKey: 'nav.rentals.addTenant' } }</c>.
   * The selector renders the create button; the parent handles the emitted
   * {@link createRequested} event with its own create form.
   */
  readonly createActions = input<Record<string, { labelKey: string }>>({});

  /**
   * Configures cascading EntityRef filters, keyed by the child property name —
   * e.g. <c>{ unit: { dependsOn: 'property', via: 'isPartOf' } }</c> filters
   * the unit dropdown to options whose <c>isPartOf</c> equals the selected
   * property. A child without a selected parent shows no options.
   */
  readonly fieldDependencies = input<Record<string, { dependsOn: string; via: string }>>({});

  /**
   * Per-field footer templates, keyed by property name, rendered below that
   * field's control — e.g. an inline "create tenant" form. The template
   * context is <c>{ $implicit: prop }</c>.
   */
  readonly fieldFooters = input<Record<string, TemplateRef<unknown> | null>>({});

  /**
   * Generic "New / Edit" manage jump buttons per entity path — keyed by the
   * EntityRef target path (e.g. 'properties', 'rooms'). Any EntityRef field
   * whose target path is configured renders an "Edit" button (when a value is
   * selected) and a "New" button to the right of the selector. The config
   * builds the query params for both; the cascading parent value (if any) is
   * passed through so a child entity can deep-link into its parent's page.
   */
  readonly manage = input<Record<string, EntityManageConfig>>({});

  /**
   * Whether per-field <c>sh:description</c> hints are shown under EntityRef
   * selects. Set to false when the surrounding layout already communicates
   * the field (e.g. jump buttons alongside).
   */
  readonly showDescriptions = input(true);

  // ── Outputs ─────────────────────────────────────────────────────────────

  readonly saved = output<Record<string, unknown>>();
  readonly cancelled = output<void>();

  /** Emitted when a configured inline create action is requested. */
  readonly createRequested = output<{ propertyName: string; entityPath: string }>();

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

  /** The loaded frontend shape schema (drives field descriptions). */
  private readonly shapeSchema = signal<ShapeSchema | null>(null);

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

    // Load the shape schema once when a shape key is provided.
    effect(() => {
      const key = this.shapeKey();
      if (!key) {
        this.shapeKeys.set(null);
        this.shapeSchema.set(null);
        return;
      }
      this.validator.loadSchema(key)
        .then((schema) => {
          this.shapeKeys.set(schema.keys.map((k) => k.key));
          this.shapeSchema.set(schema);
        })
        .catch(() => {
          this.shapeKeys.set(null);
          this.shapeSchema.set(null);
        });
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

  /** Visual help: the shape's sh:description for a JSON key, if any. */
  descriptionFor(key: string): string | null {
    return this.shapeSchema()?.keyByName.get(key)?.description ?? null;
  }

  /** Normalizes a stored reference (IRI string or { iri }) to a plain IRI. */
  asIri(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && 'iri' in (value as object)) {
      return ((value as { iri: unknown }).iri as string) ?? '';
    }
    return '';
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
