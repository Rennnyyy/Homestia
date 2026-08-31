import { Component, ElementRef, inject, input, output, signal, viewChild, type OnDestroy } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  LucideSparkles,
  LucideMic,
  LucideSquare,
  LucideArrowUp,
  LucideX,
} from '@lucide/angular';
import { AiFlowService, type AiContentPart, type AiFlowEvent } from '../../../core/ai/ai-flow.service';

/** A property the AI can match against when deciding create vs edit. */
export interface AiExistingProperty {
  iri: string;
  name?: string;
  address?: string;
  [key: string]: unknown;
}

/**
 * AiAssistantPanel — the visible face of AI-assisted form filling.
 *
 * Paths A (chat) and C (voice) both flow through here: the panel collects a
 * free-text prompt and an optional voice recording, streams the scenario's
 * progress, and emits the validated form proposal so the parent can render it
 * in review. Voice is recorded in the browser and sent to the backend as a
 * raw audio content part with its real media type — the SDK transcribes it
 * and feeds the text into the flow.
 *
 * The composer is voice-first and sized for a 50+ audience: a large
 * microphone button on the left (it morphs into a red Stop while recording)
 * beside the text field, and a labeled "Send" button on the right. Stopping
 * a recording immediately sends the voice note; the final voice note is shown
 * inside the composer so the user knows it was captured.
 *
 * While the AI works, a large high-contrast working panel (spinner + status +
 * progress bar) replaces quiet small text, so it is always obvious the AI is
 * running. Once the flow settles — success or failure — the panel shows a
 * single plain-language summary of the outcome and nothing else: no raw token
 * stream, no raw error text. Typography and touch targets stay oversized for
 * a 50+ audience.
 */
@Component({
  selector: 'app-ai-assistant-panel',
  standalone: true,
  imports: [
    FormsModule,
    TranslocoPipe,
    NgTemplateOutlet,
    LucideSparkles,
    LucideMic,
    LucideSquare,
    LucideArrowUp,
    LucideX,
  ],
  template: `
    @if (framed()) {
      <div class="border border-border rounded-lg px-4 py-3" style="margin: 16px 0;">
        <ng-container *ngTemplateOutlet="content" />
      </div>
    } @else {
      <ng-container *ngTemplateOutlet="content" />
    }

    <ng-template #content>
      <div class="ai-panel">
        <!-- Heading -->
        @if (showHeading()) {
          <div class="ai-heading">
            <svg lucideSparkles class="size-6 text-primary"></svg>
            <span>{{ 'ai.title' | transloco }}</span>
          </div>
        }

        <!-- Recording error -->
        @if (recordingError()) {
          <p class="ai-error-text">{{ recordingError() | transloco }}</p>
        }

        <!-- Big, unmissable "the AI is working" state -->
        @if (running()) {
          <div class="ai-working" role="status" aria-live="polite">
            <span class="ai-working-spinner" aria-hidden="true"></span>
            <p class="ai-working-status">{{ status() | transloco }}</p>
            <div class="ai-progress-track" aria-hidden="true">
              <div class="ai-progress-bar"></div>
            </div>
          </div>
        }

        <!-- Outcome summary — the only thing shown once the AI settles -->
        @if (summary()) {
          <div class="ai-summary" [class.ai-summary-error]="failed()">
            <span class="ai-summary-icon" aria-hidden="true">
              @if (failed()) {
                <svg lucideX class="size-5"></svg>
              } @else {
                <svg lucideSparkles class="size-5"></svg>
              }
            </span>
            <div>
              <p class="ai-summary-text">{{ summary() }}</p>
            </div>
          </div>
        }

        <!-- Edit target picker (AI detected an edit but no property matched) -->
        @if (pickProperty()) {
          <div class="ai-pick">
            <p class="ai-pick-title">{{ 'ai.pickPropertyTitle' | transloco }}</p>
            <p class="ai-pick-hint">{{ 'ai.pickPropertyHint' | transloco }}</p>
            <div class="ai-pick-list">
              @for (p of existingProperties(); track p.iri) {
                <button type="button" class="ai-pick-option" (click)="startEdit(p)">
                  <span class="ai-pick-name">{{ p.name }}</span>
                  @if (p.address) {
                    <span class="ai-pick-address">{{ p.address }}</span>
                  }
                </button>
              }
            </div>
            <button type="button" class="ai-pick-cancel" (click)="cancelPick()">
              {{ 'ai.pickCancel' | transloco }}
            </button>
          </div>
        }

        <!-- Composer: mic left, text in the middle, labeled Send right -->
        <div
          class="ai-composer"
          [class.ai-composer-recording]="recording()"
          [class.ai-composer-busy]="running()"
        >
          <div class="ai-composer-row">
            <!-- Microphone on the LEFT — morphs into Stop while recording -->
            <button
              type="button"
              class="ai-mic-btn"
              [class.ai-mic-recording]="recording()"
              (click)="onToggleRecord()"
              [disabled]="running()"
              [attr.aria-label]="recording() ? ('ai.stopRecording' | transloco) : ('ai.recordVoice' | transloco)"
              [title]="recording() ? ('ai.stopRecording' | transloco) : ('ai.recordVoice' | transloco)"
            >
              @if (recording()) {
                <svg lucideSquare class="ai-mic-btn-svg"></svg>
              } @else {
                <svg lucideMic class="ai-mic-btn-svg"></svg>
              }
            </button>

            <div class="ai-composer-main">
              @if (recording()) {
                <!-- Listening state lives inside the composer -->
                <div class="ai-input-area ai-listening">
                  <span class="ai-recording-dot" aria-hidden="true"></span>
                  <span class="ai-listening-label">{{ 'ai.listening' | transloco }}</span>
                  <div class="flex-1"></div>
                  <span class="ai-listening-timer">{{ formatDuration(recordingSeconds()) }}</span>
                  <button type="button" class="ai-listening-stop" (click)="onToggleRecord()" [attr.aria-label]="'ai.stopRecording' | transloco">
                    <svg lucideSquare class="size-4"></svg>
                    <span>{{ 'ai.stopRecording' | transloco }}</span>
                  </button>
                </div>
              } @else if (audio()) {
                <!-- The final voice note lives inside the composer -->
                <div class="ai-input-area ai-final-voice">
                  <svg lucideMic class="ai-final-voice-icon"></svg>
                  <span class="ai-final-voice-label">{{ 'ai.voiceAdded' | transloco }}</span>
                  <span class="ai-final-voice-duration">{{ formatDuration(audio()!.duration) }}</span>
                  <div class="flex-1"></div>
                  <button type="button" class="ai-voice-remove" (click)="removeAudio()" [attr.aria-label]="'ai.removeVoice' | transloco">
                    <svg lucideX class="size-5"></svg>
                  </button>
                </div>
              } @else {
                <textarea
                  #composerInput
                  [(ngModel)]="prompt"
                  class="ai-composer-input"
                  [placeholder]="'ai.placeholder' | transloco"
                  (keydown.enter)="onSubmitKey($event)"
                  (input)="autosize()"
                ></textarea>
              }
            </div>

            <!-- Labeled Send on the RIGHT — never a mystery icon -->
            <button
              type="button"
              class="ai-send-btn"
              (click)="submit()"
              [disabled]="!canSend()"
              [attr.aria-label]="'ai.send' | transloco"
              [title]="'ai.send' | transloco"
            >
              @if (running()) {
                <span class="ai-send-spinner" aria-hidden="true"></span>
              } @else {
                <svg lucideArrowUp class="ai-send-btn-svg"></svg>
                <span>{{ 'ai.send' | transloco }}</span>
              }
            </button>
          </div>
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    /* ── Layout ─────────────────────────────────────────────── */
    .ai-panel {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .ai-heading {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--foreground);
    }

    /* ── Composer input area: listening / final voice ───────── */
    .ai-input-area {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      min-height: 52px;
      padding: 0.5rem 0.75rem;
      border-radius: 0.75rem;
    }
    .ai-listening {
      border: 1px solid color-mix(in oklch, var(--destructive) 30%, transparent);
      background: color-mix(in oklch, var(--destructive) 8%, transparent);
    }
    .ai-listening-label {
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--destructive);
    }
    .ai-listening-timer {
      font-size: 1rem;
      color: var(--destructive);
      font-variant-numeric: tabular-nums;
    }
    .ai-listening-stop {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      border: none;
      background: var(--destructive);
      color: #fff;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      padding: 0.4rem 0.8rem;
      border-radius: 9999px;
      transition: filter 0.15s ease;
    }
    .ai-listening-stop:hover {
      filter: brightness(1.08);
    }
    .ai-final-voice {
      border: 1px solid var(--border);
      background: var(--muted);
    }
    .ai-final-voice-icon {
      width: 1.25rem;
      height: 1.25rem;
      color: var(--primary);
      flex-shrink: 0;
    }
    .ai-final-voice-label {
      font-size: 1rem;
      font-weight: 500;
      color: var(--foreground);
    }
    .ai-final-voice-duration {
      font-size: 0.9rem;
      color: var(--muted-foreground);
      font-variant-numeric: tabular-nums;
    }
    .ai-voice-remove {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border-radius: 9999px;
      border: none;
      background: transparent;
      color: var(--muted-foreground);
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .ai-voice-remove:hover {
      background: var(--secondary);
      color: var(--destructive);
    }

    /* ── Recording pulse dot ────────────────────────────────── */
    .ai-recording-dot {
      width: 0.8rem;
      height: 0.8rem;
      border-radius: 9999px;
      background: var(--destructive);
      animation: aiPulse 1s ease-in-out infinite;
    }

    /* ── Status lines ───────────────────────────────────────── */
    .ai-error-text {
      font-size: 1rem;
      color: var(--destructive);
      margin: 0;
    }

    /* ── Working state — clear but not oversized ────────────── */
    .ai-working {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.8rem;
      text-align: center;
      border: 1px solid color-mix(in oklch, var(--primary) 30%, transparent);
      border-radius: 1rem;
      background: color-mix(in oklch, var(--primary) 6%, transparent);
      padding: 1.15rem 1rem 1rem;
    }
    .ai-working-spinner {
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 9999px;
      border: 3px solid color-mix(in oklch, var(--primary) 22%, transparent);
      border-top-color: var(--primary);
      animation: aiSpin 0.9s linear infinite;
    }
    .ai-working-status {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--foreground);
      margin: 0;
    }
    .ai-progress-track {
      width: 100%;
      height: 0.5rem;
      border-radius: 9999px;
      background: color-mix(in oklch, var(--primary) 15%, transparent);
      overflow: hidden;
    }
    .ai-progress-bar {
      width: 40%;
      height: 100%;
      border-radius: 9999px;
      background: linear-gradient(90deg, oklch(0.541 0.281 293.009), oklch(0.623 0.214 259.815));
      animation: aiProgress 1.4s ease-in-out infinite;
    }

    /* ── Outcome summary ────────────────────────────────────── */
    .ai-summary {
      display: flex;
      align-items: flex-start;
      gap: 0.7rem;
      border: 1px solid color-mix(in oklch, var(--primary) 30%, transparent);
      border-radius: 0.9rem;
      background: color-mix(in oklch, var(--primary) 8%, transparent);
      padding: 0.8rem 1rem;
    }
    .ai-summary-error {
      border-color: color-mix(in oklch, var(--destructive) 35%, transparent);
      background: color-mix(in oklch, var(--destructive) 8%, transparent);
    }
    .ai-summary-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border-radius: 9999px;
      flex-shrink: 0;
      background: color-mix(in oklch, var(--primary) 20%, transparent);
      color: var(--primary);
    }
    .ai-summary-error .ai-summary-icon {
      background: color-mix(in oklch, var(--destructive) 18%, transparent);
      color: var(--destructive);
    }
    .ai-summary-text {
      font-size: 1.05rem;
      line-height: 1.4;
      color: var(--foreground);
      margin: 0;
    }

    /* ── Edit target picker ────────────────────────────────── */
    .ai-pick {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      border: 1px solid var(--border);
      border-radius: 0.9rem;
      background: var(--muted);
      padding: 1rem;
    }
    .ai-pick-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--foreground);
      margin: 0;
    }
    .ai-pick-hint {
      font-size: 0.95rem;
      color: var(--muted-foreground);
      margin: 0 0 0.25rem;
    }
    .ai-pick-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 220px;
      overflow-y: auto;
    }
    .ai-pick-option {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.15rem;
      text-align: left;
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      background: var(--card);
      padding: 0.75rem 1rem;
      cursor: pointer;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .ai-pick-option:hover {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px color-mix(in oklch, var(--primary) 15%, transparent);
    }
    .ai-pick-name {
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--foreground);
    }
    .ai-pick-address {
      font-size: 0.95rem;
      color: var(--muted-foreground);
    }
    .ai-pick-cancel {
      align-self: flex-start;
      border: none;
      background: transparent;
      color: var(--muted-foreground);
      font-size: 0.95rem;
      cursor: pointer;
      padding: 0.35rem 0.5rem;
      border-radius: 9999px;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .ai-pick-cancel:hover {
      background: var(--secondary);
      color: var(--foreground);
    }

    /* ── Composer (voice-first row) ─────────────────────────── */
    .ai-composer {
      border: 2px solid var(--border);
      border-radius: 1.25rem;
      padding: 0.5rem;
      background: var(--card);
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .ai-composer:focus-within {
      border-color: var(--primary);
      box-shadow: 0 0 0 4px color-mix(in oklch, var(--primary) 15%, transparent);
    }
    .ai-composer-recording {
      border-color: var(--destructive);
      box-shadow: 0 0 0 4px color-mix(in oklch, var(--destructive) 15%, transparent);
    }
    .ai-composer-busy {
      opacity: 0.5;
      pointer-events: none;
    }
    .ai-composer-row {
      display: flex;
      align-items: flex-end;
      gap: 0.5rem;
    }
    .ai-composer-main {
      flex: 1;
      min-width: 0;
    }
    .ai-composer-input {
      width: 100%;
      border: none;
      outline: none;
      resize: none;
      background: transparent;
      color: var(--foreground);
      font-size: 1.05rem;
      line-height: 1.5;
      min-height: 52px;
      max-height: 160px;
      padding: 0.5rem 0.5rem 0.25rem;
      font-family: inherit;
    }
    .ai-composer-input::placeholder {
      color: var(--muted-foreground);
    }

    /* ── Microphone — left, morphs into Stop while recording ── */
    .ai-mic-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 3rem;
      height: 3rem;
      border-radius: 9999px;
      border: none;
      background: color-mix(in oklch, var(--primary) 12%, transparent);
      color: var(--primary);
      cursor: pointer;
      flex-shrink: 0;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .ai-mic-btn:hover:not(:disabled) {
      background: color-mix(in oklch, var(--primary) 22%, transparent);
    }
    .ai-mic-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .ai-mic-btn-svg {
      width: 1.4rem;
      height: 1.4rem;
    }
    .ai-mic-recording {
      color: #fff;
      background: var(--destructive);
      animation: aiMicPulse 1.2s ease-in-out infinite;
    }
    .ai-mic-recording:hover:not(:disabled) {
      background: var(--destructive);
      color: #fff;
    }
    .ai-mic-recording .ai-mic-btn-svg {
      color: #fff;
    }

    /* ── Send — labeled, never a mystery icon ─────────────── */
    .ai-send-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      min-width: 6.5rem;
      height: 3rem;
      padding: 0 1.1rem;
      border-radius: 9999px;
      border: none;
      background: linear-gradient(135deg, oklch(0.541 0.281 293.009), oklch(0.623 0.214 259.815));
      color: #fff;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      flex-shrink: 0;
      box-shadow: 0 4px 14px -4px rgba(124, 58, 237, 0.5);
      transition: filter 0.15s ease, transform 0.15s ease, opacity 0.15s ease;
    }
    .ai-send-btn:hover:not(:disabled) {
      filter: brightness(1.08);
      transform: translateY(-1px);
    }
    .ai-send-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      transform: none;
    }
    .ai-send-btn-svg {
      width: 1.3rem;
      height: 1.3rem;
    }
    .ai-send-spinner {
      width: 1.3rem;
      height: 1.3rem;
      border-radius: 9999px;
      border: 3px solid rgba(255, 255, 255, 0.35);
      border-top-color: #fff;
      animation: aiSpin 0.8s linear infinite;
    }

    /* ── Animations ─────────────────────────────────────────── */
    @keyframes aiPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.25; }
    }
    @keyframes aiMicPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.55); }
      50% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
    }
    @keyframes aiSpin {
      to { transform: rotate(360deg); }
    }
    @keyframes aiProgress {
      0% { transform: translateX(-130%); }
      100% { transform: translateX(330%); }
    }

    /* ── Narrow screens: stack the composer (textarea full-width on top) ── */
    @media (max-width: 640px) {
      .ai-composer-row {
        flex-wrap: wrap;
      }
      .ai-composer-main {
        order: 1;
        flex-basis: 100%;
        width: 100%;
      }
      .ai-mic-btn {
        order: 2;
      }
      .ai-send-btn {
        order: 3;
        margin-left: auto;
      }
    }
  `],
})
export class AiAssistantPanelComponent implements OnDestroy {
  private readonly flow = inject(AiFlowService);
  private readonly translate = inject(TranslocoService);
  private readonly composerInput = viewChild<ElementRef<HTMLTextAreaElement>>('composerInput');

  /** Scenario key used for text/voice requests. */
  readonly textScenarioKey = input.required<string>();

  /** Scenario key used for editing an existing property from text/voice. */
  readonly editTextScenarioKey = input<string>();

  /** Scenario key used to continue/correct an in-progress draft. */
  readonly completeTextScenarioKey = input<string>();

  /** Scenario key used to detect create-vs-edit intent from text/voice. */
  readonly intentTextScenarioKey = input<string>();

  /** Existing properties the AI can match against for edits. */
  readonly existingProperties = input<AiExistingProperty[]>([]);

  /** The in-progress draft to continue/correct (set by "Ask again"). */
  readonly draft = input<Record<string, unknown> | null>(null);

  /** The draft's property IRI when it is an existing edit (null for a create draft). */
  readonly draftIri = input<string | null>(null);

  /** The current form context (existing values for edit; {} for create). */
  readonly context = input<Record<string, unknown>>({});

  /** When true (default) the panel is wrapped in its own bordered frame. */
  readonly framed = input(true);

  /** When true (default) the panel shows its own heading. */
  readonly showHeading = input(true);

  /** Emits the validated form proposal when the flow completes. */
  readonly proposal = output<Record<string, unknown>>();

  /** Emits the edited property's IRI (null when the flow was a create). */
  readonly editIri = output<string | null>();

  /** Emits true while an AI request is running, false when it settles. */
  readonly busy = output<boolean>();

  readonly prompt = signal('');
  readonly running = signal(false);
  readonly status = signal('ai.filling');
  readonly summary = signal<string | null>(null);
  readonly failed = signal(false);
  readonly pickProperty = signal(false);

  // ── Voice recording state ────────────────────────────────────────────────
  readonly recording = signal(false);
  readonly recordingError = signal<string | null>(null);
  readonly recordingSeconds = signal(0);
  readonly audio = signal<{ name: string; dataUrl: string; duration: number; mime: string } | null>(null);
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaChunks: Blob[] = [];
  private recordingStartedAt = 0;
  private recordingTimer: ReturnType<typeof setInterval> | null = null;
  private pendingPick: { parts: AiContentPart[]; input: Record<string, unknown> } | null = null;
  private destroyed = false;

  /** True when there is something to send and no request is running. */
  canSend(): boolean {
    return !this.running() && (this.prompt().trim().length > 0 || !!this.audio());
  }

  // ── Voice recording ──────────────────────────────────────────────────────

  /** Start or stop a voice recording (mic button toggle). */
  async onToggleRecord(): Promise<void> {
    if (this.running()) return;
    if (this.recording()) {
      this.stopRecording();
      return;
    }
    await this.startRecording();
  }

  private async startRecording(): Promise<void> {
    if (this.running()) return;
    this.recordingError.set(null);
    this.summary.set(null);
    this.failed.set(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickSupportedAudioMimeType();
      let recorder: MediaRecorder;
      try {
        recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      } catch {
        recorder = new MediaRecorder(stream);
      }
      this.mediaStream = stream;
      this.mediaRecorder = recorder;
      this.mediaChunks = [];
      this.recordingStartedAt = Date.now();
      this.recordingSeconds.set(0);
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) this.mediaChunks.push(event.data);
      };
      recorder.onstop = () => this.finishRecording(recorder, stream);
      recorder.onerror = () => {
        this.recording.set(false);
        this.stopTimer();
        this.recordingError.set('ai.voiceError');
      };
      recorder.start();
      this.recording.set(true);
      this.startTimer();
    } catch {
      this.recordingError.set('ai.voiceUnsupported');
    }
  }

  private stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  private async finishRecording(recorder: MediaRecorder, stream: MediaStream): Promise<void> {
    stream.getTracks().forEach((track) => track.stop());
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.recording.set(false);
    this.stopTimer();
    if (this.destroyed) return;

    const duration = (Date.now() - this.recordingStartedAt) / 1000;
    // Normalize the recorder's mime (e.g. "audio/webm;codecs=opus") to its bare
    // type — the backend's whisper path must not receive a parameterized
    // Content-Type or a ".wav"-labeled WebM.
    const mime = normalizeAudioMime(recorder.mimeType || 'audio/webm');
    const blob = new Blob(this.mediaChunks, { type: mime });
    try {
      // Send the raw recorded bytes with their true media type — the backend
      // transcribes WebM/MP4/OGG directly; no client-side re-encode needed.
      const dataUrl = await blobToDataUrl(blob);
      this.audio.set({ name: audioFileName(mime), dataUrl, duration, mime });
      // ChatGPT-like: stopping the recording immediately sends the voice note.
      await this.submit();
    } catch {
      this.recordingError.set('ai.voiceError');
    }
  }

  private startTimer(): void {
    this.stopTimer();
    this.recordingTimer = setInterval(() => {
      this.recordingSeconds.set(Math.floor((Date.now() - this.recordingStartedAt) / 1000));
    }, 250);
  }

  private stopTimer(): void {
    if (this.recordingTimer !== null) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
  }

  removeAudio(): void {
    this.audio.set(null);
  }

  formatDuration(seconds: number): string {
    const total = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(total / 60);
    const rest = total % 60;
    return `${minutes}:${rest.toString().padStart(2, '0')}`;
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.stopTimer();
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  /** Enter sends; Shift+Enter inserts a newline. */
  onSubmitKey(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey) return;
    event.preventDefault();
    void this.submit();
  }

  /** Keep the composer height in step with its content. */
  autosize(): void {
    const el = this.composerInput()?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 52), 160)}px`;
  }

  async submit(): Promise<void> {
    const prompt = this.prompt().trim();
    const audio = this.audio();
    if (this.running() || (!prompt && !audio)) return;

    const parts: AiContentPart[] = [
      ...(audio ? [{ type: 'audio', url: audio.dataUrl, mime: audio.mime } as AiContentPart] : []),
    ];
    const input: Record<string, unknown> = { userPrompt: prompt, current: this.context() };

    this.pickProperty.set(false);
    this.pendingPick = null;
    this.beginRun();

    // "Ask again" — continue/correct the in-progress draft: run the edit
    // scenario (which preserves the draft's values) with the draft as context,
    // so "add address …" completes it instead of starting over.
    const draft = this.draft();
    if (draft) {
      // Dedicated complete scenario: applies the follow-up request on top of
      // the draft ("add address …"), keeping everything already filled.
      await this.runFlow(
        parts,
        { userPrompt: prompt, current: this.normalizePropertyForAi(draft) },
        this.draftIri(),
        'complete',
      );
      return;
    }

    try {
      // Figure out from the prompt (text or voice) whether this is a create or an edit.
      const intent = await this.detectIntent(prompt, parts);
      if (intent?.intent === 'edit') {
        const target = this.existingProperties().find((p) => p.iri === intent.propertyIri);
        if (target) {
          await this.runFlow(parts, { ...input, current: this.normalizePropertyForAi(target) }, target.iri);
          return;
        }
        if (this.existingProperties().length === 0) {
          // Nothing exists to edit — treat the request as a create.
          await this.runFlow(parts, input, null);
          return;
        }
        // Edit intended but nothing matched — ask the user which property.
        this.pendingPick = { parts, input };
        this.finishRun();
        this.pickProperty.set(true);
        return;
      }
      await this.runFlow(parts, input, null);
    } catch {
      this.finishRun();
      this.failed.set(true);
      this.summary.set(this.translate.translate('ai.summaryError'));
    }
  }

  /** Detects create-vs-edit intent from the prompt (text or transcribed voice). */
  private async detectIntent(
    prompt: string,
    parts: AiContentPart[],
  ): Promise<{ intent: 'create' | 'edit'; propertyIri: string } | null> {
    const key = this.intentTextScenarioKey();
    if (!key) return null;

    this.status.set('ai.detecting');
    const outcome = await this.flow.runScenario(
      key,
      {
        userPrompt: prompt,
        properties: this.existingProperties().map((p) => ({ iri: p.iri, name: p.name, address: p.address })),
      },
      parts,
      () => {},
    );
    if (outcome.kind === 'error') return null;
    const out = outcome.finalOutput as { intent?: string; propertyIri?: string } | undefined;
    if (out && typeof out === 'object' && (out.intent === 'create' || out.intent === 'edit')) {
      return { intent: out.intent, propertyIri: typeof out.propertyIri === 'string' ? out.propertyIri : '' };
    }
    return null;
  }

  /**
   * Runs the fill scenario — create by default, edit when <c>editIri</c> is set
   * or <c>mode</c> is forced to 'edit' (used for draft corrections, where the
   * edit scenario preserves the draft's values even for a create draft).
   */
  private async runFlow(
    parts: AiContentPart[],
    input: Record<string, unknown>,
    editIri: string | null,
    mode: 'create' | 'edit' | 'complete' = editIri ? 'edit' : 'create',
  ): Promise<void> {
    const scenarioKey =
      mode === 'edit'
        ? (this.editTextScenarioKey() ?? this.textScenarioKey())
        : mode === 'complete'
          ? (this.completeTextScenarioKey() ?? this.editTextScenarioKey() ?? this.textScenarioKey())
          : this.textScenarioKey();

    this.beginRun();

    let outcome;
    try {
      outcome = await this.flow.runScenario(scenarioKey, input, parts, (evt) => this.handleEvent(evt));
    } catch {
      this.finishRun();
      this.failed.set(true);
      this.summary.set(this.translate.translate('ai.summaryError'));
      return;
    }

    this.finishRun();

    if (outcome.kind === 'error') {
      // Show only a friendly summary of the failure — never the raw error text.
      this.failed.set(true);
      this.summary.set(this.translate.translate('ai.summaryError'));
      return;
    }

    const finalOutput = outcome.finalOutput;
    if (finalOutput && typeof finalOutput === 'object' && !Array.isArray(finalOutput)) {
      this.editIri.emit(editIri);
      this.proposal.emit(finalOutput as Record<string, unknown>);
      this.failed.set(false);
      this.summary.set(this.buildSuccessSummary(finalOutput as Record<string, unknown>));
    } else {
      this.failed.set(true);
      this.summary.set(this.translate.translate('ai.summaryError'));
    }
  }

  /** The user picked an existing property to edit (intent was edit, no match). */
  startEdit(property: AiExistingProperty): void {
    const pending = this.pendingPick;
    if (!pending) return;
    this.pickProperty.set(false);
    this.pendingPick = null;
    void this.runFlow(
      pending.parts,
      { ...pending.input, current: this.normalizePropertyForAi(property) },
      property.iri,
    );
  }

  cancelPick(): void {
    this.pickProperty.set(false);
    this.pendingPick = null;
  }

  /** Normalizes nested { iri, ... } references to plain IRI strings for the AI. */
  private normalizePropertyForAi(property: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = { ...property };
    for (const [key, value] of Object.entries(out)) {
      if (typeof value === 'object' && value !== null && 'iri' in value) {
        out[key] = (value as { iri: string }).iri;
      }
    }
    return out;
  }

  private beginRun(): void {
    this.running.set(true);
    this.busy.emit(true);
    this.summary.set(null);
    this.failed.set(false);
    this.status.set('ai.filling');
  }

  private finishRun(): void {
    this.running.set(false);
    this.busy.emit(false);
    this.status.set('ai.filling');
  }

  /** A short, plain-language recap of what the AI prepared — derived from the proposal. */
  private buildSuccessSummary(data: Record<string, unknown>): string {
    const name = typeof data['name'] === 'string' ? data['name'].trim() : '';
    const address = typeof data['address'] === 'string' ? data['address'].trim() : '';
    const roomCount = Array.isArray(data['rooms']) ? data['rooms'].length : 0;
    const roomLabel =
      roomCount === 1
        ? this.translate.translate('ai.roomCountSingle')
        : this.translate.translate('ai.roomCountPlural', { rooms: roomCount });
    const params: Record<string, string> = { name, address, roomLabel };

    let key = 'ai.summaryDoneGeneric';
    if (name && address && roomCount > 0) key = 'ai.summaryDoneNameAddressRooms';
    else if (name && address) key = 'ai.summaryDoneNameAddress';
    else if (name && roomCount > 0) key = 'ai.summaryDoneNameRooms';
    else if (name) key = 'ai.summaryDoneName';
    else if (roomCount > 0) key = 'ai.summaryDoneRooms';
    return this.translate.translate(key, params);
  }

  private handleEvent(event: AiFlowEvent): void {
    switch (event.kind) {
      case 'step_started':
        this.status.set(event.name === 'detect_intent' ? 'ai.detecting' : 'ai.filling');
        break;
      case 'step_retry':
        this.status.set('ai.correcting');
        break;
      default:
        break;
    }
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** First MediaRecorder audio mime type the browser supports, or null. */
function pickSupportedAudioMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

/** Bare media type of a recorder mime, e.g. "audio/webm;codecs=opus" → "audio/webm". */
function normalizeAudioMime(mime: string): string {
  const bare = (mime || 'audio/webm').split(';')[0].trim().toLowerCase();
  return bare || 'audio/webm';
}

/** Conventional file name for a recorded voice note matching its media type. */
function audioFileName(mime: string): string {
  const type = mime.split(';')[0].trim().toLowerCase();
  const ext =
    type === 'audio/mpeg' || type === 'audio/mp3'
      ? 'mp3'
      : type === 'audio/ogg' || type === 'audio/opus'
        ? 'ogg'
        : type === 'audio/mp4' || type === 'audio/m4a' || type === 'video/mp4'
          ? 'm4a'
          : type === 'audio/webm'
            ? 'webm'
            : 'webm';
  return `voice.${ext}`;
}
