import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="space-y-1.5">
      @if (label()) {
        <label [for]="id()" class="block text-sm font-medium text-surface-700 dark:text-surface-300">
          {{ label() }}
        </label>
      }
      <input
        [id]="id()"
        [type]="type()"
        [placeholder]="placeholder()"
        [value]="value()"
        [disabled]="disabled()"
        [required]="required()"
        class="block w-full rounded-md border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 placeholder-surface-400 shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-50 dark:placeholder-surface-500"
        (input)="onInput($event)"
      />
      @if (error()) {
        <p class="text-sm text-destructive-600 dark:text-destructive-400">{{ error() }}</p>
      }
      @if (hint() && !error()) {
        <p class="text-sm text-surface-500">{{ hint() }}</p>
      }
    </div>
  `,
})
export class InputComponent {
  readonly id = input.required<string>();
  readonly label = input('');
  readonly type = input('text');
  readonly placeholder = input('');
  readonly value = input('');
  readonly disabled = input(false);
  readonly required = input(false);
  readonly error = input('');
  readonly hint = input('');

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Allow parent to read via native events or two-way binding
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
}
