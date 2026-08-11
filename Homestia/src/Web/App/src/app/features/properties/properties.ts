import { Component, inject, signal, computed, OnInit, viewChild } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmButton } from '@spartan-ng/helm/button';
import { LucideBuilding, LucidePlus, LucideChevronRight, LucideTrash } from '@lucide/angular';
import { HlmAccordionImports } from '@spartan-ng/helm/accordion';
import { AletheiaHttpClient } from '../../shared/services/aletheia-http-client';
import { DynamicEntityFormComponent } from '../../shared/components/dynamic-entity-form/dynamic-entity-form.component';
import { DynamicEntityTableComponent, type TableAction } from '../../shared/components/dynamic-entity-table/dynamic-entity-table.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { PropertyEntity, type Property } from '../../entities/property.entity';
import type { AletheiaCollection } from '../../shared/services/aletheia-http-client.models';

type PageMode = 'list' | 'create' | 'edit';

@Component({
  selector: 'app-properties',
  standalone: true,
  imports: [
    TranslocoPipe,
    HlmButton,
    LucideBuilding,
    LucidePlus,
    LucideChevronRight,
    LucideTrash,
    DynamicEntityFormComponent,
    DynamicEntityTableComponent,
    ConfirmDialogComponent,
    ...HlmAccordionImports,
  ],
  template: `
    <div class="max-w-6xl mx-auto px-6">
      <!-- Header: breadcrumb + actions -->
      <div class="flex items-center" style="padding: 15px 0 20px 0; min-height: 70px;">
        <!-- Breadcrumb -->
        <div class="flex items-center gap-2 font-bold text-foreground" style="font-size: 24px; line-height: 1;">
          <svg lucideBuilding class="size-6"></svg>
          <span>{{ 'nav.properties' | transloco }}</span>
          @if (mode() === 'create') {
            <svg lucideChevronRight class="size-6"></svg>
            <span class="text-foreground">{{ 'nav.properties.createBreadcrumb' | transloco }}</span>
          }
          @if (mode() === 'edit') {
            <svg lucideChevronRight class="size-6"></svg>
            <span class="text-foreground">{{ editingItem()?.['name'] ?? '' }}</span>
          }
        </div>

        <div class="flex-1"></div>

        <!-- Actions (list mode only) -->
        @if (mode() === 'list') {
          <div class="flex items-center gap-1">
            <button hlmBtn size="sm" (click)="enterCreate()">
              <svg lucidePlus class="size-4 mr-1"></svg>
              {{ 'nav.properties.create' | transloco }}
            </button>
          </div>
        }
      </div>

      <!-- Create/Edit mode: subtext -->
      @if (mode() === 'create') {
        <p style="font-size: 1em; color: var(--muted-foreground); margin-bottom: 15px;">{{ 'nav.properties.createSubtext' | transloco }}</p>
      }
      @if (mode() === 'edit') {
        <p style="font-size: 1em; color: var(--muted-foreground); margin-bottom: 15px;">{{ 'nav.properties.editSubtext' | transloco }}</p>
      }

      <!-- List mode: table -->
      @if (mode() === 'list') {
        <app-dynamic-entity-table
          [entity]="entity"
          [items]="items()"
          [loading]="loading()"
          [error]="error()"
          [columnNames]="['name', 'address']"
          [defaultVisibleColumns]="['name', 'address']"
          [emptyMessage]="'nav.properties.empty'"
          [actions]="rowActions"
          (rowClick)="onRowClick($event)"
          (refresh)="refresh()"
        />
        <!-- Delete confirmation dialog for list view -->
        @if (confirmingDelete() && deletingItem()) {
          <app-confirm-dialog
            [title]="'nav.properties.deleteTitle'"
            [message]="'nav.properties.deleteConfirm'"
            [confirmLabel]="'nav.properties.delete'"
            [destructive]="true"
            (confirmed)="onDelete()"
            (cancelled)="confirmingDelete.set(false); deletingItem.set(null)" />
        }
      }

      <!-- Create mode: form in accordion -->
      @if (mode() === 'create') {
        <hlm-accordion class="block mt-2 border border-border rounded-lg overflow-hidden">
          <hlm-accordion-item [isOpened]="true">
            <hlm-accordion-trigger [triggerClass]="'border-b border-border py-2 hover:bg-muted/50 hover:no-underline items-center'">
              <div class="flex items-center gap-2 text-foreground">
                <svg lucideBuilding class="size-[30px] pl-2.5"></svg>
                <span class="text-lg font-semibold">{{ 'nav.properties.accordionDetails' | transloco }}</span>
              </div>
            </hlm-accordion-trigger>
            <hlm-accordion-content>
              <div class="px-4" style="margin-top: 20px;">
                <app-dynamic-entity-form
                  [entity]="entity"
                  [mode]="'create'"
                  [fieldNames]="['name', 'address', 'propertyType', 'rentalModel']"
                  (saved)="onCreate($event)"
                />
              </div>
            </hlm-accordion-content>
          </hlm-accordion-item>
        </hlm-accordion>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px;">
          <button hlmBtn variant="outline" class="text-foreground" (click)="exitCreate()">
            {{ 'common.cancel' | transloco }}
          </button>
          <button hlmBtn (click)="formRef()?.save()">
            {{ 'nav.properties.save' | transloco }}
          </button>
        </div>
      }

      <!-- Edit mode: form in accordion -->
      @if (mode() === 'edit' && editingItem()) {
        <hlm-accordion class="block mt-2 border border-border rounded-lg overflow-hidden">
          <hlm-accordion-item [isOpened]="true">
            <hlm-accordion-trigger [triggerClass]="'border-b border-border py-2 hover:bg-muted/50 hover:no-underline items-center'">
              <div class="flex items-center gap-2 text-foreground">
                <svg lucideBuilding class="size-[30px] pl-2.5"></svg>
                <span class="text-lg font-semibold">{{ 'nav.properties.accordionDetails' | transloco }}</span>
              </div>
            </hlm-accordion-trigger>
            <hlm-accordion-content>
              <div class="px-4" style="margin-top: 20px;">
                <app-dynamic-entity-form
                  [entity]="entity"
                  [mode]="'edit'"
                  [value]="editingItem()"
                  [fieldNames]="['name', 'address', 'propertyType', 'rentalModel']"
                  (saved)="onUpdate($event)"
                />
              </div>
            </hlm-accordion-content>
          </hlm-accordion-item>
        </hlm-accordion>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px;">
          <button hlmBtn variant="outline" class="text-destructive hover:bg-destructive/10 border-destructive/30" (click)="deletingItem.set(editingItem()); confirmingDelete.set(true)">
            <svg lucideTrash class="size-4 mr-1"></svg>
            {{ 'nav.properties.delete' | transloco }}
          </button>
          <div class="flex-1"></div>
          <button hlmBtn variant="outline" class="text-foreground" (click)="exitCreate()">
            {{ 'common.cancel' | transloco }}
          </button>
          <button hlmBtn (click)="formRef()?.save()">
            {{ 'nav.properties.save' | transloco }}
          </button>
        </div>
      }

      <!-- Delete confirmation dialog -->
      @if (confirmingDelete()) {
        <app-confirm-dialog
          [title]="'nav.properties.deleteTitle'"
          [message]="'nav.properties.deleteConfirm'"
          [confirmLabel]="'nav.properties.delete'"
          [destructive]="true"
          (confirmed)="onDelete()"
          (cancelled)="confirmingDelete.set(false); deletingItem.set(null)" />
      }

      <!-- End edit mode -->
    </div>
  `,
})
export class Properties implements OnInit {
  private readonly aletheia = inject(AletheiaHttpClient);

  readonly entity = PropertyEntity;
  readonly formRef = viewChild(DynamicEntityFormComponent);
  readonly items = signal<Property[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly mode = signal<PageMode>('list');
  readonly confirmingDelete = signal(false);
  readonly deletingItem = signal<Record<string, unknown> | null>(null);

  readonly editingItem = signal<Record<string, unknown> | null>(null);

  readonly rowActions: TableAction[] = [
    { label: 'Edit', icon: 'pencil', action: (item) => this.enterEdit(item) },
    { label: 'Delete', icon: 'trash', action: (item) => { this.deletingItem.set(item); this.confirmingDelete.set(true); } },
  ];

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.error.set(null);
    this.aletheia.list<Property>(this.entity.entityPath!).subscribe({
      next: (res: AletheiaCollection<Property>) => {
        this.items.set(res.items ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Failed to load properties');
        this.loading.set(false);
      },
    });
  }

  enterCreate(): void {
    this.editingItem.set(null);
    this.mode.set('create');
  }

  enterEdit(item: Record<string, unknown>): void {
    // Normalize EntityRef values to IRIs for the form
    const normalized: Record<string, unknown> = { ...item };
    for (const [key, value] of Object.entries(normalized)) {
      if (typeof value === 'object' && value !== null && 'iri' in value) {
        normalized[key] = (value as { iri: string }).iri;
      }
    }
    this.editingItem.set(normalized);
    this.mode.set('edit');
  }

  exitCreate(): void {
    this.editingItem.set(null);
    this.deletingItem.set(null);
    this.confirmingDelete.set(false);
    this.mode.set('list');
  }

  onDelete(): void {
    const item = this.deletingItem();
    if (!item?.['iri']) return;
    this.loading.set(true);
    this.error.set(null);
    this.aletheia.delete(this.entity.entityPath!, item['iri'] as string).subscribe({
      next: () => {
        this.confirmingDelete.set(false);
        this.deletingItem.set(null);
        this.editingItem.set(null);
        this.mode.set('list');
        this.refresh();
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Failed to delete property');
        this.loading.set(false);
      },
    });
  }

  onCreate(data: Record<string, unknown>): void {
    this.loading.set(true);
    this.error.set(null);
    this.aletheia.create(this.entity.entityPath!, data).subscribe({
      next: () => {
        this.mode.set('list');
        this.editingItem.set(null);
        this.refresh();
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Failed to create property');
        this.loading.set(false);
      },
    });
  }

  onUpdate(data: Record<string, unknown>): void {
    const item = this.editingItem();
    if (!item?.['iri']) return;
    this.loading.set(true);
    this.error.set(null);
    this.aletheia.update(this.entity.entityPath!, item['iri'] as string, data).subscribe({
      next: () => {
        this.mode.set('list');
        this.editingItem.set(null);
        this.refresh();
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Failed to update property');
        this.loading.set(false);
      },
    });
  }

  onRowClick(item: Record<string, unknown>): void {
    this.enterEdit(item);
  }
}
