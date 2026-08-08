import { Directive, computed } from '@angular/core';
import { cn } from '../../utils/src';

/**
 * Styling directive for the dialog close button.
 * Apply to a <button> alongside brnDialogClose.
 */
@Directive({
  selector: '[hlmDialogClose]',
  standalone: true,
  host: {
    '[class]': '_computedClass()',
  },
})
export class HlmDialogCloseDirective {
  protected readonly _computedClass = computed(() =>
    cn(
      'absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:pointer-events-none dark:ring-offset-surface-950',
    ),
  );
}
