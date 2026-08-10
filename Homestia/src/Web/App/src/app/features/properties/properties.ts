import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmButton } from '@spartan-ng/helm/button';
import { LucideBuilding, LucidePlus, LucideRefreshCw, LucideChevronRight } from '@lucide/angular';
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
        <p style="font-size: 14px; color: var(--muted-foreground); margin-bottom: 10px;">{{ 'nav.properties.createSubtext' | transloco }}</p>
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

      <!-- Create mode: form -->
      @if (mode() === 'create') {
        <app-dynamic-entity-form
          #form
          [entity]="entity"
          [mode]="'create'"
          (saved)="onCreate($event)"
        />
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px;">
          <button hlmBtn variant="outline" (click)="exitCreate()">
            {{ 'common.cancel' | transloco }}
          </button>
          <button hlmBtn (click)="form.save()">
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
