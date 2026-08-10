import { Component, input, output, computed, signal, viewChild } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmCard } from '@spartan-ng/helm/card';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { LucideInfo, LucideCopy, LucideCheck, LucideX } from '@lucide/angular';
import { DynamicEntityFormComponent } from './dynamic-entity-form.component';
import type { EntityInfo } from '../../services/aletheia-http-client.models';

/**
 * DynamicEntityFormDialog — wraps {@link DynamicEntityFormComponent} in a
 * modal card with header (mode badge, entity name, IRI info) and footer
 * (cancel / save buttons).
 *
 * The form itself is renderer-agnostic — swap the inner component or embed
 * the core directly in a page if you don't need the dialog chrome.
 */
@Component({
  selector: 'app-dynamic-entity-form-dialog',
  standalone: true,
  imports: [
    TranslocoPipe,
    HlmCard,
    HlmButton,
    HlmBadge,
    LucideInfo,
    LucideCopy,
    LucideCheck,
    LucideX,
    DynamicEntityFormComponent,
  ],
  template: `
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black/50 z-40" (click)="close()"></div>

    <!-- Dialog card -->
    <div class="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
      <div hlmCard class="flex flex-col w-full max-w-2xl max-h-[80vh] bg-background rounded-lg shadow-2xl border-border">
        <!-- Header -->
        <header class="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
          <span hlmBadge
            [class.bg-green-100]="isCreate()"
            [class.text-green-800]="isCreate()"
            [class.bg-blue-100]="isEdit()"
            [class.text-blue-800]="isEdit()"
            [class.bg-muted]="isView()"
          >{{ 'mode.' + mode() | transloco }}</span>
          <h3 class="text-lg font-semibold text-foreground flex-1">{{ entity().displayName || entity().predicatePath }}</h3>

          <!-- IRI info (view / edit only) -->
          @if (!isCreate() && iriValue(); as iri) {
            <div class="relative">
              <button hlmBtn variant="ghost" size="icon-sm" (click)="toggleIri()" [title]="iri" class="text-muted-foreground hover:text-foreground">
                <svg lucideInfo class="size-4"></svg>
              </button>
              @if (iriOpen()) {
                <div class="absolute right-0 top-8 z-10 w-72 rounded-md border border-border bg-popover p-3 shadow-md iri-popover">
                  <div class="flex items-center gap-2">
                    <code class="flex-1 text-xs text-muted-foreground break-all">{{ iri }}</code>
                    <button hlmBtn variant="ghost" size="icon-xs" (click)="copyIri()" class="shrink-0 text-muted-foreground hover:text-foreground">
                      @if (iriCopied()) {<svg lucideCheck class="size-3.5 text-green-500"></svg>} @else {<svg lucideCopy class="size-3.5"></svg>}
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </header>

        <!-- Form body -->
        <div class="px-6 py-5 overflow-y-auto flex-1">
          <app-dynamic-entity-form
            #form
            [entity]="entity()"
            [mode]="mode()"
            [value]="value()"
            (saved)="onFormSaved($event)"
          />
        </div>

        <!-- Footer -->
        <footer class="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
          <button hlmBtn variant="outline" (click)="close()"><svg lucideX class="size-4 mr-1"></svg>{{ 'common.no' | transloco }}</button>
          @if (!isView()) {
            <button hlmBtn (click)="save()"><svg lucideCheck class="size-4 mr-1"></svg>{{ 'common.yes' | transloco }}</button>
          }
        </footer>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    @keyframes iri-pop-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
    .iri-popover { animation: iri-pop-in 0.15s ease-out; }
  `],
})
export class DynamicEntityFormDialogComponent {
  // ── Inputs ──────────────────────────────────────────────────────────

  readonly entity = input.required<EntityInfo>();
  readonly mode = input.required<'view' | 'edit' | 'create'>();
  readonly value = input<Record<string, unknown> | null>(null);

  // ── Outputs ─────────────────────────────────────────────────────────

  readonly saved = output<Record<string, unknown>>();
  readonly cancelled = output<void>();

  // ── Internal ───────────────────────────────────────────────────────

  readonly formRef = viewChild<DynamicEntityFormComponent>('form');

  readonly iriOpen = signal(false);
  readonly iriCopied = signal(false);

  readonly iriValue = computed(() => {
    const raw = this.value()?.['@id'];
    return typeof raw === 'string' ? raw : null;
  });

  readonly isView = computed(() => this.mode() === 'view');
  readonly isEdit = computed(() => this.mode() === 'edit');
  readonly isCreate = computed(() => this.mode() === 'create');

  save(): void {
    this.formRef()?.save();
  }

  onFormSaved(data: Record<string, unknown>): void {
    this.saved.emit(data);
  }

  close(): void {
    this.cancelled.emit();
  }

  toggleIri(): void {
    this.iriOpen.update((v) => !v);
    this.iriCopied.set(false);
  }

  copyIri(): void {
    const iri = this.iriValue();
    if (!iri) return;
    navigator.clipboard.writeText(iri).then(() => {
      this.iriCopied.set(true);
      setTimeout(() => this.iriCopied.set(false), 2000);
    });
  }
}
