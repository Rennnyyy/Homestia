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

  // ── Outputs ─────────────────────────────────────────────────────────────

  readonly saved = output<Record<string, unknown>>();
  readonly cancelled = output<void>();

  // ── Internal state ──────────────────────────────────────────────────────

  /** Local mutable copy of the form data (two-way bound). */
  readonly formData = signal<Record<string, unknown>>({});

  // ── Derived ─────────────────────────────────────────────────────────────

  /** Properties to display — filtered by fieldNames input if provided. */
  readonly visibleProperties = computed<EntityPropertyInfo[]>(() => {
    const props = this.entity().properties;
    const names = this.fieldNames();
    let filtered = this.mode() === 'create'
      ? props.filter((p) => p.name !== '@id')
      : props;

    if (names && names.length > 0) {
      const map = new Map(filtered.map((p) => [p.name, p]));
      filtered = names.map((n) => map.get(n)).filter((p): p is EntityPropertyInfo => !!p);
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
      } else {
        this.formData.set(data ? { ...data } : {});
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

  save(): void {
    this.saved.emit({ ...this.formData() });
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
