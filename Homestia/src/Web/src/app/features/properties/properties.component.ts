import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonComponent } from '../../shared/components/button.component';
import { PropertyFormComponent } from './property-form.component';
import type { PropertyFormValue } from './property-form.model';

@Component({
    selector: 'app-properties',
    imports: [TranslatePipe, ButtonComponent, PropertyFormComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-surface-900 dark:text-surface-50">{{ 'PROPERTIES.TITLE' | translate }}</h1>
        <button appBtn variant="primary" (click)="showForm.set(true)">
          {{ 'PROPERTIES.ADD' | translate }}
        </button>
      </div>

      <!-- Empty state -->
      @if (properties().length === 0) {
        <div class="rounded-lg border border-surface-200 p-12 text-center text-surface-400">
          {{ 'PROPERTIES.EMPTY' | translate }}
        </div>
      }

      <!-- Property list (placeholder) -->
      @if (properties().length > 0) {
        <div class="rounded-lg border border-surface-200">
          @for (p of properties(); track p.name) {
            <div class="flex items-center gap-3 border-b border-surface-200 px-4 py-3 last:border-b-0">
              <span class="font-medium text-surface-900 dark:text-surface-50">{{ p.name }}</span>
              <span class="text-sm text-surface-500">{{ p.address }}</span>
            </div>
          }
        </div>
      }

      <!-- Add Property dialog -->
      @if (showForm()) {
        <app-property-form
          [open]="showForm()"
          (close)="showForm.set(false)"
          (saved)="onSaved($event)"
        />
      }
    </div>
  `
})
export class PropertiesComponent {
  protected readonly showForm = signal(false);
  protected readonly properties = signal<PropertyFormValue[]>([]);

  protected onSaved(value: PropertyFormValue): void {
    this.properties.update(list => [...list, value]);
  }
}
