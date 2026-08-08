import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { HlmButtonDirective } from '@spartan-ng/helm/button';
import { PropertyCreateComponent } from './property-create.component';
import type { PropertyCreatePayload } from './property-form.model';

type PageView = 'list' | 'create' | 'edit';

@Component({
    selector: 'app-properties',
    imports: [TranslatePipe, HlmButtonDirective, PropertyCreateComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    <div class="space-y-4">
      @if (view() === 'list') {
        <!-- ── List View ── -->
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-semibold text-surface-900 dark:text-surface-50">{{ 'PROPERTIES.TITLE' | translate }}</h1>
          <button hlmBtn variant="primary" (click)="openCreate()">
            {{ 'PROPERTIES.ADD' | translate }}
          </button>
        </div>

        <!-- Empty state -->
        @if (properties().length === 0) {
          <div class="rounded-lg border border-surface-200 p-12 text-center text-surface-400 dark:text-surface-500">
            {{ 'PROPERTIES.EMPTY' | translate }}
          </div>
        }

        <!-- Property list -->
        @if (properties().length > 0) {
          <div class="rounded-lg border border-surface-200">
            @for (p of properties(); track p.property.name; let i = $index) {
              <button
                class="flex w-full items-center gap-3 border-b border-surface-200 px-4 py-3 text-left last:border-b-0 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                (click)="openEdit(i)"
              >
                <span class="font-medium text-surface-900 dark:text-surface-50">{{ p.property.name }}</span>
              </button>
            }
          </div>
        }
      }

      <!-- ── Create View ── -->
      @if (view() === 'create') {
        <app-property-create
          (cancelled)="view.set('list')"
          (saved)="onSaved($event)"
        />
      }

      <!-- ── Edit View ── -->
      @if (view() === 'edit') {
        <app-property-create
          [initialProperty]="properties()[editingIndex()].property"
          [initialRooms]="properties()[editingIndex()].rooms"
          (cancelled)="view.set('list')"
          (saved)="onEdited($event)"
          (deleted)="onDeleted()"
        />
      }
    </div>
  `
})
export class PropertiesComponent {
  protected readonly view = signal<PageView>('list');
  protected readonly editingIndex = signal(0);
  protected readonly properties = signal<PropertyCreatePayload[]>([]);

  protected openCreate(): void {
    this.view.set('create');
  }

  protected openEdit(index: number): void {
    this.editingIndex.set(index);
    this.view.set('edit');
  }

  protected onSaved(payload: PropertyCreatePayload): void {
    this.properties.update(list => [...list, payload]);
    this.view.set('list');
  }

  protected onEdited(payload: PropertyCreatePayload): void {
    this.properties.update(list => {
      const copy = [...list];
      copy[this.editingIndex()] = payload;
      return copy;
    });
    this.view.set('list');
  }

  protected onDeleted(): void {
    this.properties.update(list => list.filter((_, i) => i !== this.editingIndex()));
    this.view.set('list');
  }
}
