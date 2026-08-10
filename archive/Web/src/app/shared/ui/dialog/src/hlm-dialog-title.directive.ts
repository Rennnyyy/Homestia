import { Directive, computed } from '@angular/core';
import { cn } from '../../utils/src';

@Directive({
  selector: '[hlmDialogTitle]',
  standalone: true,
  host: {
    '[class]': '_computedClass()',
  },
})
export class HlmDialogTitleDirective {
  protected readonly _computedClass = computed(() =>
    cn('text-lg font-semibold leading-none tracking-tight text-surface-900 dark:text-surface-50'),
  );
}
