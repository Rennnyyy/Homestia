import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { HlmButtonDirective } from '@spartan-ng/helm/button';

@Component({
    selector: 'app-tenants',
    imports: [TranslatePipe, HlmButtonDirective],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-surface-900 dark:text-surface-50">{{ 'TENANTS.TITLE' | translate }}</h1>
        <button hlmBtn variant="primary">
          {{ 'TENANTS.ADD' | translate }}
        </button>
      </div>
      <div class="rounded-lg border border-surface-200 p-12 text-center text-surface-400">
        {{ 'TENANTS.EMPTY' | translate }}
      </div>
    </div>
  `
})
export class TenantsComponent {}
