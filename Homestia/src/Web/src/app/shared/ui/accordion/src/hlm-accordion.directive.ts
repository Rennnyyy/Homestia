import { Directive, computed } from '@angular/core';
import { cn } from '../../utils/src';

@Directive({
  selector: '[hlmAccordion]',
  standalone: true,
  host: {
    '[class]': '_computedClass()',
  },
})
export class HlmAccordionDirective {
  protected readonly _computedClass = computed(() =>
    cn('space-y-1'),
  );
}
