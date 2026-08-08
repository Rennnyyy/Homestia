import { Directive, computed } from '@angular/core';
import { cn } from '../../utils/src';

@Directive({
  selector: '[hlmDialogDescription]',
  standalone: true,
  host: {
    '[class]': '_computedClass()',
  },
})
export class HlmDialogDescriptionDirective {
  protected readonly _computedClass = computed(() =>
    cn('text-sm text-surface-500 dark:text-surface-400'),
  );
}
