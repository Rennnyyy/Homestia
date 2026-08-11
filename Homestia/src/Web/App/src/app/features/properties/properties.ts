import { Component, inject, signal, computed, OnInit, viewChild } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmButton } from '@spartan-ng/helm/button';
import { LucideBuilding, LucidePlus, LucideRefreshCw, LucideChevronRight } from '@lucide/angular';
import { HlmAccordionImports } from '@spartan-ng/helm/accordion';
import { AletheiaHttpClient } from '../../shared/services/aletheia-http-client';
import { DynamicEntityFormComponent } from '../../shared/components/dynamic-entity-form/dynamic-entity-form.component';
import { DynamicEntityTableComponent } from '../../shared/components/dynamic-entity-table/dynamic-entity-table.component';
import { PropertyEntity, type Property } from '../../entities/property.entity';
import type { AletheiaCollection } from '../../shared/services/aletheia-http-client.models';

type PageMode = 'list' | 'create';

@Component({
  selector: 'app-properties',
  standalone: true,
  imports: [
    TranslocoPipe,
    HlmButton,
    LucideBuilding,
    LucidePlus,
    LucideRefreshCw,
    LucideChevronRight,
    DynamicEntityFormComponent,
    DynamicEntityTableComponent,
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
        </div>

        <div class="flex-1"></div>

        <!-- Actions (list mode only) -->
        @if (mode() === 'list') {
          <div class="flex items-center gap-1">
            <button hlmBtn variant="ghost" size="icon-sm" (click)="refresh()" [disabled]="loading()">
              <svg lucideRefreshCw class="size-4" [class.animate-spin]="loading()"></svg>
            </button>
            <button hlmBtn size="sm" (click)="enterCreate()">
              <svg lucidePlus class="size-4 mr-1"></svg>
              {{ 'nav.properties.create' | transloco }}
            </button>
          </div>
        }
      </div>

      <!-- Create mode: subtext -->
      @if (mode() === 'create') {
        <p style="font-size: 1em; color: var(--muted-foreground); margin-bottom: 15px;">{{ 'nav.properties.createSubtext' | transloco }}</p>
      }

      <!-- List mode: table -->
      @if (mode() === 'list') {
        <app-dynamic-entity-table
          [entity]="entity"
          [items]="items()"
          [loading]="loading()"
          [error]="error()"
          (rowClick)="onRowClick($event)"
        />
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
    this.mode.set('create');
  }

  exitCreate(): void {
    this.mode.set('list');
  }

  onCreate(data: Record<string, unknown>): void {
    this.loading.set(true);
    this.error.set(null);
    this.aletheia.create(this.entity.entityPath!, data).subscribe({
      next: () => {
        this.mode.set('list');
        this.refresh();
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Failed to create property');
        this.loading.set(false);
      },
    });
  }

  onRowClick(item: Record<string, unknown>): void {
    console.log('Clicked:', item);
  }
}
