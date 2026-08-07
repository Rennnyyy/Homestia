import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { DialogModule } from '@angular/cdk/dialog';

@Component({
    selector: 'app-dialog',
    imports: [DialogModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    @if (open()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black/50 transition-opacity" (click)="close.emit()"></div>
        <!-- Panel -->
        <div
          class="relative z-50 mx-4 w-full max-w-lg rounded-lg border border-surface-200 bg-white p-6 shadow-xl dark:bg-surface-900"
          [class.sm:max-w-md]="size() === 'sm'"
          [class.sm:max-w-lg]="size() === 'md'"
          [class.sm:max-w-xl]="size() === 'lg'"
        >
          @if (title()) {
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-50">{{ title() }}</h2>
              <button
                (click)="close.emit()"
                class="rounded-md p-1 text-surface-400 hover:bg-surface-100 hover:text-surface-600"
                aria-label="Close"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          }
          <ng-content />
        </div>
      </div>
    }
  `
})
export class DialogComponent {
  readonly open = input(false);
  readonly title = input('');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly close = output<void>();
}
