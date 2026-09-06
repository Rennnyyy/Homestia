import { Component, input, output, signal, inject, effect, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { lastValueFrom } from 'rxjs';
import { LucidePlus } from '@lucide/angular';
import { AletheiaHttpClient } from '../../services/aletheia-http-client';
import { EnumI18nService } from '../../../core/services/enum-i18n.service';

/** One selectable option of an EntityRef dropdown. */
export interface EntityRefOption {
  iri: string;
  displayValue: string;
}

/**
 * EntityRefSelect — the shared "global" EntityRef selector used by the
 * dynamic entity form.
 *
 * It loads options from the target entity path and ALWAYS renders a real
 * dropdown with loading / error / retry feedback — it never silently degrades
 * to a raw IRI text input. Visual help is provided by the owning form's shape
 * description (sh:description) and an optional, configurable inline "create
 * new" action (e.g. "New Tenant") whose actual create form the parent renders.
 */
@Component({
  selector: 'app-entity-ref-select',
  standalone: true,
  imports: [FormsModule, TranslocoPipe, LucidePlus],
  templateUrl: './entity-ref-select.component.html',
  styleUrl: './entity-ref-select.component.scss',
})
export class EntityRefSelectComponent {
  private readonly aletheia = inject(AletheiaHttpClient);
  private readonly enumI18n = inject(EnumI18nService);

  /** id forwarded to the native <select> so field labels stay associated. */
  readonly fieldId = input<string>('');

  /** Target entity path to load options from (e.g. 'tenants'). */
  readonly entityPath = input.required<string>();

  /** Currently selected IRI (two-way bound via valueChange). */
  readonly value = input<string>('');

  /** Whether the control is disabled (view mode). */
  readonly disabled = input(false);

  /** i18n key for the empty placeholder option. */
  readonly placeholderKey = input('fields.placeholder.select');

  /** Optional visual help shown under the select (i18n key or plain text). */
  readonly hint = input<string | null>(null);

  /** Whether the inline "create new" action is shown. */
  readonly allowCreate = input(false);

  /** i18n key for the create button. */
  readonly createLabelKey = input('entityRefSelect.createNew');

  /**
   * Optional predicate filter for cascading dropdowns — e.g.
   * <c>{ predicate: 'isPartOf', value: '&lt;property IRI&gt;' }</c> shows only
   * options whose <c>isPartOf</c> equals the value. Null or an empty value
   * means no filtering.
   */
  readonly filter = input<{ predicate: string; value: string | null } | null>(null);

  /**
   * Bumped by the parent to force a fresh option load (e.g. after an inline
   * "create new" added an entity to this path). Unlike a value change this
   * re-fetches the option list without re-mounting the component.
   */
  readonly reloadKey = input(0);

  readonly valueChange = output<string>();
  readonly create = output<void>();

  /** Raw loaded items (kept so predicate-based cascading stays possible). */
  private readonly loaded = signal<Record<string, unknown>[]>([]);

  /**
   * Displayed options — filtered by {@link filter} when one is configured.
   * A configured filter with an empty value (e.g. no parent selected in a
   * cascade) yields NO options — never the full list — so a child dropdown
   * cannot offer unrelated entries before its parent is chosen.
   */
  readonly options = computed<EntityRefOption[]>(() => {
    const filter = this.filter();
    // Reactivity: re-derive labels when the active language changes.
    this.enumI18n.activeLang();
    const labelFor = (item: Record<string, unknown>) => this.enumI18n.labelFor(this.entityPath(), item);

    // No dependency filter configured — show every loaded option.
    if (!filter) {
      return this.loaded().map((item) => ({
        iri: (item['iri'] as string) ?? '',
        displayValue: labelFor(item),
      }));
    }

    // A filter is configured but its parent has no value yet — nothing matches.
    const filterValue = filter.value?.trim() ?? '';
    if (filterValue === '') return [];

    return this.loaded()
      .filter((item) => EntityRefSelectComponent.refIri(item[filter.predicate]) === filterValue)
      .map((item) => ({
        iri: (item['iri'] as string) ?? '',
        displayValue: labelFor(item),
      }));
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /** Last (path, reloadKey) pair this selector loaded for — dedupes effect runs. */
  private lastLoadPath = '';
  private lastLoadKey = -1;

  constructor() {
    // Load whenever the target path appears/changes OR the parent bumps the
    // reload key (inline-create + select flow) — without re-mounting.
    effect(() => {
      const path = this.entityPath();
      const key = this.reloadKey();
      if (!path) return;
      if (path === this.lastLoadPath && key === this.lastLoadKey) return;
      this.lastLoadPath = path;
      this.lastLoadKey = key;
      void this.load(path);
    });
  }

  /** (Re)loads the raw items for the given path — also used by the retry button. */
  async load(path: string = this.entityPath()): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await lastValueFrom(this.aletheia.list<Record<string, unknown>>(path));
      this.loaded.set(res.items ?? []);
    } catch {
      this.error.set('entityRefSelect.loadError');
    } finally {
      this.loading.set(false);
    }
  }

  /** Normalizes a stored reference (IRI string or { iri }) to a plain IRI. */
  private static refIri(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && 'iri' in (value as object)) {
      return ((value as { iri: unknown }).iri as string) ?? '';
    }
    return '';
  }
}
