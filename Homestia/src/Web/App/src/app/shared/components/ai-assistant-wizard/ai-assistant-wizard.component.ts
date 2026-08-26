import { Component, HostListener, inject, input, output, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmButton } from '@spartan-ng/helm/button';
import { LucideSparkles, LucideX, LucideCheck, LucideChevronRight } from '@lucide/angular';
import { AiAssistantPanelComponent } from '../ai-assistant-panel/ai-assistant-panel.component';

type WizardStepId = 'describe' | 'create' | 'review';
type WizardPhase = 'ask' | 'review';

interface WizardStepDef {
  id: WizardStepId;
  label: string;
}

/**
 * AiAssistantWizard — a full-screen, senior-friendly overlay that guides the
 * user through AI-assisted property creation and editing:
 *
 *   1. Describe  → free text / photos / voice
 *   2. AI creates → the assistant detects create-vs-edit, fills the form
 *   3. Review    → hand the validated proposal back to the page
 *
 * When the AI detects an edit of an existing property (from the prompt or a
 * transcribed voice note) it runs the edit scenario with that property as
 * context, and emits its IRI so the page opens in edit mode. If the AI cannot
 * tell which property, the panel lets the user pick one. Everything is
 * oversized for a 50+ audience: large type, big tap targets, explicit labels,
 * and a prominent close affordance. The chat surface itself is the shared
 * <app-ai-assistant-panel>, rendered frameless inside the card.
 */
@Component({
  selector: 'app-ai-assistant-wizard',
  standalone: true,
  imports: [
    TranslocoPipe,
    HlmButton,
    AiAssistantPanelComponent,
    LucideSparkles,
    LucideX,
    LucideCheck,
    LucideChevronRight,
  ],
  template: `
    <div class="ai-backdrop" (click)="onClose()">
      <div
        class="ai-card"
        (click)="$event.stopPropagation()"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="'ai.wizardTitle' | transloco"
      >
        <!-- Header -->
        <header class="ai-header">
          <div class="flex items-center gap-3">
            <span class="ai-header-icon" aria-hidden="true">
              <svg lucideSparkles class="ai-header-sparkles"></svg>
            </span>
            <div>
              <h2 class="ai-title">{{ 'ai.wizardTitle' | transloco }}</h2>
              <p class="ai-subtitle">{{ 'ai.wizardSubtitle' | transloco }}</p>
            </div>
          </div>
          <button type="button" class="ai-close" (click)="onClose()" [attr.aria-label]="'ai.wizardClose' | transloco">
            <svg lucideX class="ai-close-icon"></svg>
          </button>
        </header>

        <!-- Step indicator -->
        <nav class="ai-steps" aria-label="Steps">
          @for (step of steps; track step.id; let i = $index; let last = $last) {
            <div class="flex items-center">
              <div
                class="ai-step"
                [class.ai-step-active]="stepState(step.id) === 'active'"
                [class.ai-step-done]="stepState(step.id) === 'done'"
              >
                <span class="ai-step-num">
                  @if (stepState(step.id) === 'done') {
                    <svg lucideCheck class="size-4"></svg>
                  } @else {
                    {{ i + 1 }}
                  }
                </span>
                <span class="ai-step-label">{{ step.label | transloco }}</span>
              </div>
              @if (!last) {
                <div class="ai-step-line" [class.ai-step-line-done]="stepState(step.id) !== 'todo'"></div>
              }
            </div>
          }
        </nav>

        <!-- Body -->
        <div class="ai-body">
          @if (phase() === 'ask') {
            <app-ai-assistant-panel
              [framed]="false"
              [textScenarioKey]="textScenarioKey()"
              [photosScenarioKey]="photosScenarioKey()"
              [editTextScenarioKey]="editTextScenarioKey()"
              [editPhotosScenarioKey]="editPhotosScenarioKey()"
              [completeTextScenarioKey]="completeTextScenarioKey()"
              [completePhotosScenarioKey]="completePhotosScenarioKey()"
              [intentTextScenarioKey]="intentTextScenarioKey()"
              [intentPhotosScenarioKey]="intentPhotosScenarioKey()"
              [existingProperties]="existingProperties()"
              [draft]="draft()"
              [draftIri]="draftIri()"
              [context]="context()"
              (proposal)="onProposal($event)"
              (editIri)="lastEditIri.set($event)"
              (busy)="busy.set($event)"
            />
          } @else {
            <div class="ai-done">
              <span class="ai-done-icon" aria-hidden="true">
                <svg lucideCheck class="ai-done-check"></svg>
              </span>
              <h3 class="ai-done-title">{{ 'ai.wizardDoneTitle' | transloco }}</h3>
              <p class="ai-done-hint">{{ 'ai.wizardDoneHint' | transloco }}</p>
            </div>
          }
        </div>

        <!-- Footer -->
        <footer class="ai-footer">
          <button hlmBtn variant="outline" size="lg" class="text-foreground" style="font-size: 1.05rem;" (click)="onClose()">
            {{ 'ai.wizardClose' | transloco }}
          </button>
          @if (phase() === 'review') {
            <button hlmBtn size="lg" style="font-size: 1.05rem;" (click)="continue()">
              {{ 'ai.wizardReview' | transloco }}
              <svg lucideChevronRight class="size-5 ml-1"></svg>
            </button>
          }
        </footer>
      </div>
    </div>
  `,
  styles: [`
    /* ── Backdrop ─────────────────────────────────────────────── */
    .ai-backdrop {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      overflow-y: auto;
      animation: aiFadeIn 0.2s ease-out;
    }

    /* ── Card ─────────────────────────────────────────────────── */
    .ai-card {
      width: 100%;
      max-width: 660px;
      max-height: 92dvh;
      display: flex;
      flex-direction: column;
      background: var(--card);
      color: var(--card-foreground);
      border: 1px solid var(--border);
      border-radius: 1.25rem;
      box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.45);
      overflow: hidden;
      animation: aiScaleIn 0.25s ease-out;
    }

    /* ── Header (gradient band) ───────────────────────────────── */
    .ai-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1.4rem 1.5rem;
      background: linear-gradient(135deg, oklch(0.541 0.281 293.009), oklch(0.623 0.214 259.815));
      color: #fff;
      flex-shrink: 0;
    }
    .ai-header-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 3.25rem;
      height: 3.25rem;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.2);
      flex-shrink: 0;
    }
    .ai-header-sparkles {
      width: 1.9rem;
      height: 1.9rem;
      color: #fff;
    }
    .ai-title {
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 1.1;
      margin: 0;
    }
    .ai-subtitle {
      font-size: 1rem;
      line-height: 1.35;
      margin: 0.25rem 0 0;
      opacity: 0.92;
      max-width: 30rem;
    }
    .ai-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 9999px;
      border: none;
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
      cursor: pointer;
      flex-shrink: 0;
      transition: background 0.15s ease;
    }
    .ai-close:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    .ai-close-icon {
      width: 1.5rem;
      height: 1.5rem;
    }

    /* ── Steps ────────────────────────────────────────────────── */
    .ai-steps {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border);
      background: var(--secondary);
      flex-shrink: 0;
    }
    .ai-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
    }
    .ai-step-num {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border-radius: 9999px;
      border: 2px solid var(--border);
      color: var(--muted-foreground);
      background: transparent;
      font-size: 1rem;
      font-weight: 600;
      transition: all 0.2s ease;
    }
    .ai-step-label {
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--muted-foreground);
      white-space: nowrap;
    }
    .ai-step-active .ai-step-num {
      border-color: var(--primary);
      color: var(--primary);
      box-shadow: 0 0 0 4px color-mix(in oklch, var(--primary) 18%, transparent);
    }
    .ai-step-active .ai-step-label {
      color: var(--foreground);
    }
    .ai-step-done .ai-step-num {
      border-color: var(--primary);
      background: var(--primary);
      color: var(--primary-foreground);
    }
    .ai-step-done .ai-step-label {
      color: var(--foreground);
    }
    .ai-step-line {
      width: 2.75rem;
      height: 2px;
      border-radius: 2px;
      background: var(--border);
      margin-bottom: 1.35rem;
      transition: background 0.2s ease;
    }
    .ai-step-line-done {
      background: var(--primary);
    }

    /* ── Body ─────────────────────────────────────────────────── */
    .ai-body {
      padding: 1.5rem 1.5rem 0.5rem;
      overflow-y: auto;
      flex: 1;
    }

    /* ── Done / review state ──────────────────────────────────── */
    .ai-done {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 0.5rem;
      padding: 2.25rem 1rem 2.5rem;
    }
    .ai-done-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 5.25rem;
      height: 5.25rem;
      border-radius: 9999px;
      background: linear-gradient(135deg, oklch(0.541 0.281 293.009), oklch(0.623 0.214 259.815));
      box-shadow: 0 12px 30px -6px rgba(124, 58, 237, 0.55);
      margin-bottom: 0.75rem;
    }
    .ai-done-check {
      width: 2.75rem;
      height: 2.75rem;
      color: #fff;
    }
    .ai-done-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--foreground);
      margin: 0;
    }
    .ai-done-hint {
      font-size: 1.05rem;
      color: var(--muted-foreground);
      margin: 0;
      max-width: 26rem;
    }

    /* ── Footer ───────────────────────────────────────────────── */
    .ai-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border);
      flex-shrink: 0;
    }

    /* ── Animations ───────────────────────────────────────────── */
    @keyframes aiFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes aiScaleIn {
      from { opacity: 0; transform: scale(0.96) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    /* ── Small screens ────────────────────────────────────────── */
    @media (max-width: 640px) {
      .ai-card {
        max-height: 94dvh;
        border-radius: 1rem;
      }
      .ai-body {
        padding: 1.25rem 1.25rem 0.25rem;
      }
      .ai-header {
        padding: 1.1rem 1.25rem;
      }
      .ai-steps {
        padding: 0.9rem 1rem;
      }
      .ai-footer {
        padding: 0.9rem 1.25rem;
      }
    }
  `],
})
export class AiAssistantWizardComponent {
  readonly textScenarioKey = input.required<string>();
  readonly photosScenarioKey = input<string>();
  readonly editTextScenarioKey = input<string>();
  readonly editPhotosScenarioKey = input<string>();
  readonly completeTextScenarioKey = input<string>();
  readonly completePhotosScenarioKey = input<string>();
  readonly intentTextScenarioKey = input<string>();
  readonly intentPhotosScenarioKey = input<string>();
  readonly existingProperties = input<{ iri: string; name?: string; address?: string; [key: string]: unknown }[]>([]);
  readonly draft = input<Record<string, unknown> | null>(null);
  readonly draftIri = input<string | null>(null);
  readonly context = input<Record<string, unknown>>({});

  /** Emits the validated form proposal when the user confirms the review step. */
  readonly proposal = output<Record<string, unknown>>();

  /** Emits the IRI of the property the AI edited (null for a create). */
  readonly editIri = output<string | null>();

  /** Emits when the wizard should be dismissed. */
  readonly close = output<void>();

  readonly phase = signal<WizardPhase>('ask');
  readonly busy = signal(false);
  private readonly lastProposal = signal<Record<string, unknown> | null>(null);
  readonly lastEditIri = signal<string | null>(null);

  readonly steps: WizardStepDef[] = [
    { id: 'describe', label: 'ai.wizardStep1' },
    { id: 'create', label: 'ai.wizardStep2' },
    { id: 'review', label: 'ai.wizardStep3' },
  ];

  /** Where a step sits in the flow: 'todo' | 'active' | 'done'. */
  stepState(id: WizardStepId): 'todo' | 'active' | 'done' {
    switch (id) {
      case 'describe':
        return this.busy() || this.phase() === 'review' ? 'done' : 'active';
      case 'create':
        return this.phase() === 'review' ? 'done' : this.busy() ? 'active' : 'todo';
      case 'review':
        return this.phase() === 'review' ? 'active' : 'todo';
    }
  }

  onProposal(data: Record<string, unknown>): void {
    this.lastProposal.set(data);
    this.phase.set('review');
  }

  /** User confirmed the review step — hand the proposal to the page. */
  continue(): void {
    const data = this.lastProposal();
    if (!data) return;
    // Emit the edit IRI first so the page has it set before it handles the proposal.
    this.editIri.emit(this.lastEditIri());
    this.proposal.emit(data);
    this.close.emit();
  }

  /** Dismiss the wizard without applying anything. */
  onClose(): void {
    this.close.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }
}
