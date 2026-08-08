import { Directive, computed } from '@angular/core';
import { cva } from 'class-variance-authority';
import { cn } from '../../utils/src';

export const inputVariants = cva(
  'block w-full rounded-md border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 placeholder-surface-400 shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-50 dark:placeholder-surface-500',
);

@Directive({
  selector: '[hlmInput]',
  standalone: true,
  host: {
    '[class]': '_computedClass()',
  },
})
export class HlmInputDirective {
  protected readonly _computedClass = computed(() => cn(inputVariants()));
}
