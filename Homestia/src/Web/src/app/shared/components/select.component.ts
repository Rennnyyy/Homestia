import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

export interface SelectOption<T = string> {
  value: T;
  label: string;
}

@Component({
  selector: 'app-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="space-y-1.5">
      @if (label()) {
        <label [for]="id()" class="block text-sm font-medium text-surface-700 dark:text-surface-300">
          {{ label() }}
        </label>
      }
      <select
        [id]="id()"
        [value]="value()"
        [disabled]="disabled()"
        (change)="onChange($event)"
        class="block w-full rounded-md border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 shadow-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-50"
      >
        @if (placeholder()) {
          <option value="" disabled>{{ placeholder() }}</option>
        }
        @for (opt of options(); track opt.value) {
          <option [value]="opt.value">{{ opt.label }}</option>
        }
      </select>
      @if (error()) {
        <p class="text-sm text-destructive-600 dark:text-destructive-400">{{ error() }}</p>
      }
    </div>
  `,
})
export class SelectComponent<T = string> {
  readonly id = input.required<string>();
  readonly label = input('');
  readonly placeholder = input('');
  readonly value = input<T | string>('');
  readonly options = input.required<SelectOption<T>[]>();
  readonly disabled = input(false);
  readonly error = input('');
  readonly valueChange = output<T | string>();

  onChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.valueChange.emit(select.value);
  }
}
