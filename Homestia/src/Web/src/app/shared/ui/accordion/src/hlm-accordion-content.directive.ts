import { Directive, computed } from '@angular/core';
import { cn } from '../../utils/src';

@Directive({
  selector: '[hlmAccordionContent]',
  standalone: true,
  host: {
    '[class]': '_computedClass()',
  },
})
export class HlmAccordionContentDirective {
  protected readonly _computedClass = computed(() =>
    cn(
      'overflow-hidden border-t border-surface-200 px-4 py-4 dark:border-surface-700',
      'data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
    ),
  );
}
