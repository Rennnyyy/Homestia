import { Component, input, output, computed, model } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmCard } from '@spartan-ng/helm/card';
import { HlmButton } from '@spartan-ng/helm/button';
import {
  LucidePencil, LucideTrash, LucideEye,
  LucideMoreHorizontal, LucidePlus, LucideDownload,
  LucideCheck, LucideX,
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
  imports: [TranslocoPipe, HlmCard, HlmButton, NgComponentOutlet],
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
        <p class="text-lg">{{ emptyMessage() }}</p>
      </section>
    }
    @if (!loading() && !error() && items().length > 0) {
      <div hlmCard class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border bg-muted/50">
              @if (selectable()) {
                <th class="w-10 px-3 py-3">
                  <input type="checkbox" class="size-4 rounded border-input"
                    [checked]="allSelected()" (change)="toggleAll()" />
                </th>
              }
              @for (col of columns(); track col.name) {
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
                @for (col of columns(); track col.name) {
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
  readonly emptyMessage = input('No items to display.');
  readonly loadingMessage = input('Loading...');
  readonly selectable = input(false);
  readonly selectedIris = model<Set<string>>(new Set());
  readonly actions = input<TableAction[]>([]);
  readonly rowClick = output<Record<string, unknown>>();

  readonly columns = computed(() => this.entity().properties);

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
