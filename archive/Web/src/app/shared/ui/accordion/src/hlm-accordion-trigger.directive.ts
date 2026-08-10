import { Directive, computed } from '@angular/core';
import { cn } from '../../utils/src';

@Directive({
  selector: '[hlmAccordionTrigger]',
  standalone: true,
  host: {
    '[class]': '_computedClass()',
  },
})
export class HlmAccordionTriggerDirective {
  protected readonly _computedClass = computed(() =>
    cn(
      'flex w-full items-center justify-between px-4 py-3 text-left font-medium text-surface-900 transition-colors hover:bg-surface-50 dark:text-surface-50 dark:hover:bg-surface-800',
      'data-[state=open]:border-b data-[state=open]:border-surface-200 dark:data-[state=open]:border-surface-700',
      '[&>svg]:transition-transform [&>svg]:duration-200 data-[state=open]:[&>svg]:rotate-180',
    ),
  );
}
