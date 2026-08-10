import { Directive, computed } from '@angular/core';
import { cva } from 'class-variance-authority';
import { cn } from '../../utils/src';

export const selectVariants = cva(
  'block w-full appearance-none rounded-md border border-surface-300 bg-white px-3 py-2 pr-8 text-sm text-surface-900 shadow-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-50',
);

@Directive({
  selector: '[hlmSelect]',
  standalone: true,
  host: {
    '[class]': '_computedClass()',
  },
})
export class HlmSelectDirective {
  protected readonly _computedClass = computed(() => cn(selectVariants()));
}
