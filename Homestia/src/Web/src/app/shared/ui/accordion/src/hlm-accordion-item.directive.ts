import { Directive, computed } from '@angular/core';
import { cn } from '../../utils/src';

@Directive({
  selector: '[hlmAccordionItem]',
  standalone: true,
  host: {
    '[class]': '_computedClass()',
  },
})
export class HlmAccordionItemDirective {
  protected readonly _computedClass = computed(() =>
    cn('rounded-lg border border-surface-200 dark:border-surface-700'),
  );
}
