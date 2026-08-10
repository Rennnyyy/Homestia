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

  // ── Inputs ──────────────────────────────────────────────────────────────

  /** The entity definition (from AletheiaModelService). */
  readonly entity = input.required<EntityInfo>();

  /** Display mode. */
  readonly mode = input.required<'view' | 'edit' | 'create'>();

  /** Current entity data (null / empty object for create). */
  readonly value = input<Record<string, unknown> | null>(null);

  // ── Outputs ─────────────────────────────────────────────────────────────

  readonly saved = output<Record<string, unknown>>();
  readonly cancelled = output<void>();

  // ── Internal state ──────────────────────────────────────────────────────

  /** Local mutable copy of the form data (two-way bound). */
  readonly formData = signal<Record<string, unknown>>({});

  // ── Derived ─────────────────────────────────────────────────────────────

  /** Properties to display — all, except @id on create. */
  readonly visibleProperties = computed<EntityPropertyInfo[]>(() => {
    const props = this.entity().properties;
    if (this.mode() === 'create') {
      return props.filter((p) => p.name !== '@id');
    }
    return props;
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
