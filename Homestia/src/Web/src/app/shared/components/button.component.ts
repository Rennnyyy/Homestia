import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'button[appBtn]',
  standalone: true,
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.Eager,
  host: {
    '[class]': 'classes()',
  },
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly disabled = input(false);
  readonly loading = input(false);

  protected classes(): string {
    const base =
      'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

    const sizes: Record<ButtonSize, string> = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    const variants: Record<ButtonVariant, string> = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
      secondary:
        'border border-surface-300 bg-white text-surface-700 hover:bg-surface-50 dark:bg-surface-800 dark:text-surface-200 dark:hover:bg-surface-700',
      ghost: 'text-surface-600 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800',
      destructive: 'bg-destructive-600 text-white hover:bg-destructive-700',
    };

    return `${base} ${sizes[this.size()]} ${variants[this.variant()]}`;
  }
}
