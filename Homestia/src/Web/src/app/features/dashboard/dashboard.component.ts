import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-dashboard',
    imports: [TranslatePipe],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    <div class="space-y-6">
      <h1 class="text-2xl font-semibold text-surface-900 dark:text-surface-50">{{ 'DASHBOARD.TITLE' | translate }}</h1>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div class="rounded-lg border border-surface-200 bg-surface-50 p-6 dark:bg-surface-900">
          <p class="text-sm text-surface-500">{{ 'DASHBOARD.TOTAL_PROPERTIES' | translate }}</p>
          <p class="text-3xl font-semibold text-surface-900 dark:text-surface-50">{{ 'DASHBOARD.NO_DATA' | translate }}</p>
        </div>
        <div class="rounded-lg border border-surface-200 bg-surface-50 p-6 dark:bg-surface-900">
          <p class="text-sm text-surface-500">{{ 'DASHBOARD.ACTIVE_TENANTS' | translate }}</p>
          <p class="text-3xl font-semibold text-surface-900 dark:text-surface-50">{{ 'DASHBOARD.NO_DATA' | translate }}</p>
        </div>
        <div class="rounded-lg border border-surface-200 bg-surface-50 p-6 dark:bg-surface-900">
          <p class="text-sm text-surface-500">{{ 'DASHBOARD.OPEN_MAINTENANCE' | translate }}</p>
          <p class="text-3xl font-semibold text-surface-900 dark:text-surface-50">{{ 'DASHBOARD.NO_DATA' | translate }}</p>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent {}
