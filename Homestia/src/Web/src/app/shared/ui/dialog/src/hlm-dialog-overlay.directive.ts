import { Directive, computed } from '@angular/core';
import { cn } from '../../utils/src';

@Directive({
  selector: '[hlmDialogOverlay]',
  standalone: true,
  host: {
    '[class]': '_computedClass()',
  },
})
export class HlmDialogOverlayDirective {
  protected readonly _computedClass = computed(() =>
    cn('fixed inset-0 z-40 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'),
  );
}
