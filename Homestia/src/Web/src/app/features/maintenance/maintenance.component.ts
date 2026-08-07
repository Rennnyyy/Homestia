import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-maintenance',
    imports: [TranslatePipe],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-surface-900 dark:text-surface-50">{{ 'MAINTENANCE.TITLE' | translate }}</h1>
        <button class="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
          {{ 'MAINTENANCE.ADD' | translate }}
        </button>
      </div>
      <div class="rounded-lg border border-surface-200 p-12 text-center text-surface-400">
        {{ 'MAINTENANCE.EMPTY' | translate }}
      </div>
    </div>
  `
})
export class MaintenanceComponent {}
