import { Directive, computed } from '@angular/core';
import { cn } from '../../utils/src';

@Directive({
  selector: '[hlmDialogHeader]',
  standalone: true,
  host: {
    '[class]': '_computedClass()',
  },
})
export class HlmDialogHeaderDirective {
  protected readonly _computedClass = computed(() =>
    cn('flex flex-col space-y-1.5 text-center sm:text-left'),
  );
}
