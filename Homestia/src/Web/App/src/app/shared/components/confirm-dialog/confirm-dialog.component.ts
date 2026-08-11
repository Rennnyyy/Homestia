import { Component, input, output, HostListener } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmButton } from '@spartan-ng/helm/button';
import { LucideTrash } from '@lucide/angular';

/**
 * ConfirmDialog — a simple modal confirmation dialog.
 *
 * Usage:
 *   @if (showDialog()) {
 *     <app-confirm-dialog
 *       [title]="'Delete?'"
 *       [message]="'Are you sure?'"
 *       [confirmLabel]="'Delete'"
 *       [destructive]="true"
 *       (confirmed)="onConfirm()"
 *       (cancelled)="showDialog.set(false)" />
 *   }
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [TranslocoPipe, HlmButton, LucideTrash],
  template: `
    <!-- Backdrop -->
    <div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" (click)="cancelled.emit()" style="position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5);">
      <!-- Dialog card -->
      <div (click)="$event.stopPropagation()"
        style="background: var(--card); color: var(--card-foreground); border-radius: 0.75rem; box-shadow: 0 10px 25px rgba(0,0,0,0.3); padding: 1.5rem; max-width: calc(24rem + 50px); width: 100%; margin: 0 1rem;">
        <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem; align-items: center;">
          <svg lucideTrash style="width: 3em; height: 3em; color: var(--destructive); flex-shrink: 0;"></svg>
          <div>
            <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.25rem;">{{ title() | transloco }}</h3>
            <p style="font-size: 0.875rem; color: var(--muted-foreground);">{{ message() | transloco }}</p>
          </div>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
          <button hlmBtn variant="outline" class="text-foreground" (click)="cancelled.emit()">
            {{ cancelLabel() | transloco }}
          </button>
          <button hlmBtn
            [variant]="destructive() ? 'destructive' : 'default'"
            (click)="confirmed.emit()">
            {{ confirmLabel() | transloco }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ConfirmDialogComponent {
  readonly title = input('Confirm');
  readonly message = input('');
  readonly confirmLabel = input('common.save');
  readonly cancelLabel = input('common.cancel');
  readonly destructive = input(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cancelled.emit();
  }
}
