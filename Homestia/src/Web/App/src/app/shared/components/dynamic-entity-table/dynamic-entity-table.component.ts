import { Component, input, output, computed, model, signal, HostListener } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmCard } from '@spartan-ng/helm/card';
import { HlmButton } from '@spartan-ng/helm/button';
import { FormsModule } from '@angular/forms';
import {
  LucidePencil, LucideTrash, LucideEye,
  LucideMoreHorizontal, LucidePlus, LucideDownload,
  LucideCheck, LucideX, LucideSettings, LucideRefreshCw,
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
  imports: [TranslocoPipe, HlmCard, HlmButton, NgComponentOutlet, FormsModule, LucideSettings, LucideRefreshCw],
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
            @for (item of items(); track item['iri'] ?? $index) {
              <tr class="border-b border-border transition-colors hover:bg-muted/30 cursor-pointer"
                (click)="onRowClick(item)">
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

  // ── Column management ──────────────────────────────────────────────────

  /** Full ordered set of available columns. If null, all entity properties. */
  readonly columnNames = input<string[] | null>(null);
  /** Columns visible by default. If null, all available columns are visible. */
  readonly defaultVisibleColumns = input<string[] | null>(null);
  /** Current visible column set (two-way bindable for persistence). */
  readonly visibleColumns = model<string[]>([]);

  readonly pickerOpen = signal(false);

  /** All available columns in the defined order. */
  readonly allColumns = computed<EntityPropertyInfo[]>(() => {
    const props = this.entity().properties;
    const names = this.columnNames();
    if (names && names.length > 0) {
      const map = new Map(props.map((p) => [p.name, p]));
      return names.map((n) => map.get(n)).filter((p): p is EntityPropertyInfo => !!p);
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
      if (typeof value === 'object' && value !== null && 'iri' in value) {
        return String((value as { iri: string }).iri);
      }
      if (typeof value === 'string') return value;
      return '—';
    }
    return String(value);
  }

  onRowClick(item: Record<string, unknown>): void {
    if (this.clickable()) this.rowClick.emit(item);
  }

  iconFor(name: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (ICONS[name] ?? LucideMoreHorizontal) as any;
  }
}
