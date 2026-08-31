import { Component, input, output, computed, model, signal, HostListener, effect, inject, untracked, TemplateRef } from '@angular/core';
import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmCard } from '@spartan-ng/helm/card';
import { HlmButton } from '@spartan-ng/helm/button';
import { FormsModule } from '@angular/forms';
import { ShaclValidatorService } from '../../../core/shapes';
import { lastValueFrom } from 'rxjs';
import { AletheiaHttpClient } from '../../services/aletheia-http-client';
import { EnumI18nService } from '../../../core/services/enum-i18n.service';
import {
  LucidePencil, LucideTrash, LucideEye,
  LucideMoreHorizontal, LucidePlus, LucideDownload,
  LucideCheck, LucideX, LucideSettings, LucideRefreshCw, LucideChevronRight,
} from '@lucide/angular';
import type { EntityInfo, EntityPropertyInfo } from '../../services/aletheia-http-client.models';

/** Describes an action button rendered per row. */
export interface TableAction {
  label: string;
  icon: string;
  action: (item: Record<string, unknown>) => void;
}

/** Known action icon names → Lucide component. */
const ICONS: Record<string, unknown> = {
  pencil: LucidePencil, trash: LucideTrash, eye: LucideEye,
  more: LucideMoreHorizontal, plus: LucidePlus, download: LucideDownload,
  check: LucideCheck, x: LucideX,
};

@Component({
  selector: 'app-dynamic-entity-table',
  standalone: true,
  imports: [TranslocoPipe, HlmCard, HlmButton, NgComponentOutlet, NgTemplateOutlet, FormsModule, LucideSettings, LucideRefreshCw, LucideChevronRight],
  template: `
    @if (loading()) {
      <section hlmCard class="p-8 text-center text-muted-foreground">
        <p class="text-lg">{{ loadingMessage() }}</p>
      </section>
    }
    @if (!loading() && error()) {
      <section hlmCard class="p-8 text-center border-destructive/50">
        <p class="text-lg text-destructive">{{ error() }}</p>
      </section>
    }
    @if (!loading() && !error() && items().length === 0) {
      <section hlmCard class="p-12 text-center text-muted-foreground">
        <p class="text-lg">{{ emptyMessage() | transloco }}</p>
      </section>
    }
    @if (!loading() && !error() && items().length > 0) {
      <div hlmCard style="--card-spacing: 0px; overflow: visible;">
        <!-- Column picker button -->
        @if (allColumns().length > 0) {
          <div class="flex justify-end px-3 pt-2 relative" style="padding-bottom: calc(var(--spacing) * 2);">
            <button hlmBtn variant="ghost" size="icon-xs" (click)="refresh.emit()" [disabled]="loading()" title="Refresh" style="margin-right: 5px;">
              <svg lucideRefreshCw class="size-4" [class.animate-spin]="loading()"></svg>
            </button>
            <button hlmBtn variant="ghost" size="icon-xs" (click)="togglePicker($event)" title="Configure columns">
              <svg lucideSettings class="size-5"></svg>
            </button>
            @if (pickerOpen()) {
              <div class="absolute right-2 top-9 z-50 bg-popover border border-border rounded-md shadow-lg p-2 min-w-[180px]"
                (click)="$event.stopPropagation()">
                <p class="text-xs font-medium text-muted-foreground px-2 py-1">{{ 'table.configureColumns' | transloco }}</p>
                @for (col of allColumns(); track col.name) {
                  <label class="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm text-foreground">
                    <input type="checkbox" class="size-3.5 rounded border-input"
                      [ngModel]="visibleColumnSet().has(col.name)"
                      (ngModelChange)="toggleColumn(col.name)" />
                    {{ labelKey(col) | transloco }}
                  </label>
                }
              </div>
            }
          </div>
        }
        <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border bg-muted/50">
              @if (expandable()) {
                <th class="w-8 px-2 py-3"></th>
              }
              @if (selectable()) {
                <th class="w-10 px-3 py-3">
                  <input type="checkbox" class="size-4 rounded border-input"
                    [checked]="allSelected()" (change)="toggleAll()" />
                </th>
              }
              @for (col of displayColumns(); track col.name) {
                <th class="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                  {{ labelKey(col) | transloco }}
                  @if (col.isCollection) {<span class="text-xs opacity-50 ml-1">(list)</span>}
                </th>
              }
              @if (actions().length > 0) {
                <th class="w-10 px-3 py-3"></th>
              }
            </tr>
          </thead>
          <tbody>
            <ng-template #dataRow let-item>
              <tr class="border-b border-border transition-colors hover:bg-muted/30 cursor-pointer"
                (click)="onRowClick(item)">
                @if (expandable()) {
                  <td class="w-8 px-2 py-2.5" (click)="toggleExpand($event, item)">
                    <button hlmBtn variant="ghost" size="icon-xs" class="size-6 text-muted-foreground"
                      [attr.aria-expanded]="isExpanded(item)" title="Expand">
                      <svg lucideChevronRight class="size-4 transition-transform" [class.rotate-90]="isExpanded(item)"></svg>
                    </button>
                  </td>
                }
                @if (selectable()) {
                  <td class="w-10 px-3 py-2.5" (click)="$event.stopPropagation()">
                    <input type="checkbox" class="size-4 rounded border-input"
                      [checked]="isSelected(item['iri'])"
                      (change)="toggleItem(item)" />
                  </td>
                }
                @for (col of displayColumns(); track col.name) {
                  <td class="px-4 py-2.5 whitespace-nowrap text-foreground">
                    {{ formatCell(item[col.name], col) }}
                  </td>
                }
                @if (actions().length > 0) {
                  <td class="w-10 px-3 py-2.5" (click)="$event.stopPropagation()">
                    <div class="flex items-center gap-1">
                      @for (action of actions(); track action.label) {
                        <button hlmBtn variant="ghost" size="icon-xs"
                          [title]="action.label"
                          (click)="action.action(item)">
                          <ng-container [ngComponentOutlet]="iconFor(action.icon)" />
                        </button>
                      }
                    </div>
                  </td>
                }
              </tr>
              @if (isExpanded(item) && rowDetail()) {
                <tr class="border-b border-border bg-muted/20">
                  <td [attr.colspan]="colspan()" class="px-4 py-3">
                    <ng-container *ngTemplateOutlet="rowDetail(); context: { $implicit: item }" />
                  </td>
                </tr>
              }
            </ng-template>

            @for (item of items(); track item['iri'] ?? $index) {
              @if (isGroup(item)) {
                <tr class="border-b border-border bg-muted/40 cursor-pointer" (click)="toggleGroup($event, item)">
                  <td [attr.colspan]="colspan()" class="px-3 py-2">
                    <div class="flex items-center gap-2">
                      <button hlmBtn variant="ghost" size="icon-xs" class="size-6 text-muted-foreground">
                        <svg lucideChevronRight class="size-4 transition-transform" [class.rotate-90]="isGroupExpanded(item)"></svg>
                      </button>
                      <span class="font-semibold text-foreground">{{ groupLabel(item) | transloco }}</span>
                      <span class="text-xs text-muted-foreground">({{ groupChildren(item).length }})</span>
                    </div>
                  </td>
                </tr>
                @if (isGroupExpanded(item)) {
                  @for (child of groupChildren(item); track child['iri'] ?? $index) {
                    <ng-container *ngTemplateOutlet="dataRow; context: { $implicit: child }" />
                  }
                }
              } @else {
                <ng-container *ngTemplateOutlet="dataRow; context: { $implicit: item }" />
              }
            }
          </tbody>
        </table>
      </div>
      </div>
    }
  `,
  styles: [`:host { display: block; }`],
})
export class DynamicEntityTableComponent {
  private readonly validator = inject(ShaclValidatorService);
  private readonly aletheia = inject(AletheiaHttpClient);
  private readonly enumI18n = inject(EnumI18nService);

  /** Loaded options per EntityRef target path (iri → item) for cell labelling. */
  private readonly refLookup = signal<Map<string, Map<string, Record<string, unknown>>>>(new Map());

  readonly entity = input.required<EntityInfo>();
  readonly items = input.required<any[]>();
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly clickable = input(true);
  readonly emptyMessage = input('table.empty');
  readonly loadingMessage = input('Loading...');
  readonly selectable = input(false);
  readonly selectedIris = model<Set<string>>(new Set());
  readonly actions = input<TableAction[]>([]);
  readonly rowClick = output<Record<string, unknown>>();
  readonly refresh = output<void>();

  // ── Tree / expandable rows ──────────────────────────────────────────────

  /** Tree mode: renders a chevron expand column on every row. */
  readonly expandable = input(false);
  /** Template rendered in a full-width row beneath an expanded row (context: the item). */
  readonly rowDetail = input<TemplateRef<unknown> | null>(null);

  /** IRIs of currently expanded rows. */
  readonly expandedIris = signal<Set<string>>(new Set());

  isExpanded(item: Record<string, unknown>): boolean {
    const iri = item['iri'];
    return typeof iri === 'string' && this.expandedIris().has(iri);
  }

  toggleExpand(event: Event, item: Record<string, unknown>): void {
    event.stopPropagation();
    const iri = item['iri'];
    if (typeof iri !== 'string') return;
    const next = new Set(this.expandedIris());
    next.has(iri) ? next.delete(iri) : next.add(iri);
    this.expandedIris.set(next);
  }

  /** Total rendered columns, including the expand, selection, and action columns. */
  readonly colspan = computed<number>(() => {
    let count = this.displayColumns().length;
    if (this.expandable()) count += 1;
    if (this.selectable()) count += 1;
    if (this.actions().length > 0) count += 1;
    return count;
  });

  // ── Group rows (state-grouped tree tables) ──────────────────────────────

  /** Item key that marks a group-header row (e.g. '__group'). */
  readonly groupField = input<string | null>(null);
  /** Item key holding the group's display label (an i18n key). */
  readonly groupLabelField = input<string | null>(null);
  /** Item key holding the group's child rows. */
  readonly groupChildrenField = input<string | null>(null);

  /** Group keys the user collapsed (groups start expanded). */
  readonly collapsedIris = signal<Set<string>>(new Set());

  isGroup(item: Record<string, unknown>): boolean {
    const field = this.groupField();
    return !!field && typeof item[field] === 'string' && (item[field] as string).length > 0;
  }

  groupKey(item: Record<string, unknown>): string {
    const field = this.groupField();
    return field && typeof item[field] === 'string' ? `group:${item[field]}` : '';
  }

  isGroupExpanded(item: Record<string, unknown>): boolean {
    const key = this.groupKey(item);
    return key ? !this.collapsedIris().has(key) : true;
  }

  toggleGroup(event: Event, item: Record<string, unknown>): void {
    event.stopPropagation();
    const key = this.groupKey(item);
    if (!key) return;
    const next = new Set(this.collapsedIris());
    next.has(key) ? next.delete(key) : next.add(key);
    this.collapsedIris.set(next);
  }

  groupLabel(item: Record<string, unknown>): string {
    const field = this.groupLabelField();
    return field && typeof item[field] === 'string' ? (item[field] as string) : '';
  }

  groupChildren(item: Record<string, unknown>): Record<string, unknown>[] {
    const field = this.groupChildrenField();
    const children = field ? item[field] : null;
    return Array.isArray(children) ? (children as Record<string, unknown>[]) : [];
  }

  // ── Column management ──────────────────────────────────────────────────

  /** Full ordered set of available columns. If null, all entity properties. */
  readonly columnNames = input<string[] | null>(null);
  /** Columns visible by default. If null, all available columns are visible. */
  readonly defaultVisibleColumns = input<string[] | null>(null);
  /** Current visible column set (two-way bindable for persistence). */
  readonly visibleColumns = model<string[]>([]);

  /** Optional: frontend shape key — its sh:property keys are the columns. */
  readonly shapeKey = input<string | null>(null);
  /** Shape-driven JSON keys in display order (null = no shape / not loaded). */
  private readonly shapeKeys = signal<string[] | null>(null);

  constructor() {
    // Load the shape schema once when a shape key is provided — keys absent
    // from the shape are not available as columns.
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

    // Load the option lists for every EntityRef column so cells can render
    // human labels (and translate enum values by key) instead of raw IRIs.
    effect(() => {
      const paths = [
        ...new Set(
          this.allColumns()
            .filter((p) => p.type === 'EntityRef' && p.targetEntityPath)
            .map((p) => p.targetEntityPath as string)
        ),
      ];
      void this.loadRefs(paths);
    });
  }

  readonly pickerOpen = signal(false);

  /** All available columns in the defined order. */
  readonly allColumns = computed<EntityPropertyInfo[]>(() => {
    const props = this.entity().properties;
    const names = this.columnNames();
    const shapeKeys = this.shapeKeys();
    const map = new Map(props.map((p) => [p.name, p]));
    if (names && names.length > 0) {
      return names.map((n) => map.get(n)).filter((p): p is EntityPropertyInfo => !!p);
    }
    if (shapeKeys && shapeKeys.length > 0) {
      // The shape's sh:property order IS the column order; keys without a
      // matching entity property (like `rooms`) are dropped.
      return shapeKeys.map((n) => map.get(n)).filter((p): p is EntityPropertyInfo => !!p);
    }
    return props;
  });

  /** Set of currently visible column names. */
  readonly visibleColumnSet = computed<Set<string>>(() => {
    const current = this.visibleColumns();
    if (current.length > 0) return new Set(current);
    const defaults = this.defaultVisibleColumns();
    if (defaults && defaults.length > 0) return new Set(defaults);
    // Default: all columns visible
    return new Set(this.allColumns().map((c) => c.name));
  });

  /** Columns to actually display. */
  readonly displayColumns = computed<EntityPropertyInfo[]>(() => {
    const visible = this.visibleColumnSet();
    return this.allColumns().filter((c) => visible.has(c.name));
  });

  toggleColumn(name: string): void {
    const current = this.visibleColumnSet();
    const next = new Set(current);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    this.visibleColumns.set([...next]);
  }

  togglePicker(event: Event): void {
    event.stopPropagation();
    this.pickerOpen.set(!this.pickerOpen());
  }

  @HostListener('document:click')
  closePicker(): void {
    this.pickerOpen.set(false);
  }

  readonly allSelected = computed(() => {
    const items = this.items();
    if (items.length === 0) return false;
    return items.every((item) => this.selectedIris().has(item['iri']));
  });

  isSelected(iri: unknown): boolean {
    return typeof iri === 'string' && this.selectedIris().has(iri);
  }

  toggleItem(item: Record<string, unknown>): void {
    const iri = item['iri'];
    if (typeof iri !== 'string') return;
    const next = new Set(this.selectedIris());
    next.has(iri) ? next.delete(iri) : next.add(iri);
    this.selectedIris.set(next);
  }

  toggleAll(): void {
    if (this.allSelected()) {
      this.selectedIris.set(new Set());
    } else {
      const iris = this.items()
        .map((item) => item['iri'])
        .filter((iri): iri is string => typeof iri === 'string');
      this.selectedIris.set(new Set(iris));
    }
  }

  labelKey(prop: EntityPropertyInfo): string {
    return `fields.${this.entity().predicatePath}.${prop.name}`;
  }

  formatCell(value: unknown, prop: EntityPropertyInfo): string {
    if (value === null || value === undefined) return '—';
    if (prop.type === 'Boolean') return value ? '✓' : '—';
    if (prop.isCollection) {
      if (Array.isArray(value)) return `${value.length} item(s)`;
      return '—';
    }
    if (prop.type === 'EntityRef') {
      const iri = DynamicEntityTableComponent.refIri(value);
      if (!iri) return '—';
      const target = prop.targetEntityPath;
      const item = target ? this.refLookup().get(target)?.get(iri) : undefined;
      return item ? this.enumI18n.labelFor(target ?? '', item) : iri;
    }
    return String(value);
  }

  /** Loads the option lists for EntityRef columns into {@link refLookup}. */
  private async loadRefs(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    // `untracked`: reading refLookup must NOT become an effect dependency,
    // otherwise setting it below re-triggers the loading effect endlessly.
    const lookup = new Map(untracked(() => this.refLookup()));
    await Promise.all(
      paths.map(async (path) => {
        try {
          const res = await lastValueFrom(this.aletheia.list<Record<string, unknown>>(path));
          lookup.set(
            path,
            new Map((res.items ?? []).map((it) => [(it['iri'] as string) ?? '', it]))
          );
        } catch {
          lookup.delete(path);
        }
      })
    );
    this.refLookup.set(lookup);
  }

  /** Normalizes a stored reference (IRI string or { iri }) to a plain IRI. */
  private static refIri(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && 'iri' in (value as object)) {
      return ((value as { iri: unknown }).iri as string) ?? '';
    }
    return '';
  }

  onRowClick(item: Record<string, unknown>): void {
    if (this.clickable()) this.rowClick.emit(item);
  }

  iconFor(name: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (ICONS[name] ?? LucideMoreHorizontal) as any;
  }
}
