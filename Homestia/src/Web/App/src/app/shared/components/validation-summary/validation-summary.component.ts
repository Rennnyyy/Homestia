import { Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { ShapeViolation } from '../../../core/shapes';

/**
 * ValidationSummary — renders SHACL violations as a compact list.
 * Each violation is shown as `jsonPath: message` so nested errors like
 * `rooms[0].roomSize` point straight at the offending form field.
 */
@Component({
  selector: 'app-validation-summary',
  standalone: true,
  imports: [TranslocoPipe],
  template: `
    @if (violations().length > 0) {
      <div class="border border-destructive/40 bg-destructive/5 rounded-md p-3" style="margin-top: 16px;">
        <p class="text-sm font-semibold text-destructive mb-1">{{ 'validation.failed' | transloco }}</p>
        @for (violation of violations(); track $index) {
          <p class="text-xs text-destructive">{{ violation.jsonPath }}: {{ violation.message }}</p>
        }
      </div>
    }
  `,
})
export class ValidationSummaryComponent {
  readonly violations = input.required<ShapeViolation[]>();
}
