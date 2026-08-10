import { Directive, computed } from '@angular/core';
import { cn } from '../../utils/src';

@Directive({
  selector: '[hlmDialogFooter]',
  standalone: true,
  host: {
    '[class]': '_computedClass()',
  },
})
export class HlmDialogFooterDirective {
  protected readonly _computedClass = computed(() =>
    cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2'),
  );
}
