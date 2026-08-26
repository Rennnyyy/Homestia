import { Component, ElementRef, inject, input, output, signal, viewChild, type OnDestroy } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmButton } from '@spartan-ng/helm/button';
import { LucideSparkles, LucideImage, LucideSend, LucideMic, LucideSquare, LucideVolume2, LucideX } from '@lucide/angular';
import { AiFlowService, type AiContentPart, type AiFlowEvent } from '../../../core/ai/ai-flow.service';

/**
 * AiAssistantPanel — the visible face of AI-assisted form filling.
 *
 * Paths A (chat), B (photos) and C (voice) all flow through here: the panel
 * collects a free-text prompt, optional photos, and an optional voice
 * recording, streams the scenario's progress, and emits the validated form
 * proposal so the parent can render it in review. Voice is recorded in the
 * browser and sent to the backend as a raw audio content part with its real
 * media type — the SDK transcribes it and feeds the text into the flow.
 *
 * Typography and touch targets are sized for a 50+ audience: large text,
 * generous tap areas, high-contrast labels.
 */
@Component({
  selector: 'app-ai-assistant-panel',
  standalone: true,
  imports: [FormsModule, TranslocoPipe, HlmButton, NgTemplateOutlet, LucideSparkles, LucideImage, LucideSend],
  template: `
    @if (framed()) {
      <div class="border border-border rounded-lg px-4 py-3" style="margin: 16px 0;">
        <ng-container *ngTemplateOutlet="content" />
      </div>
    } @else {
      <ng-container *ngTemplateOutlet="content" />
    }

    <ng-template #content>
      <div class="flex items-center gap-2 font-semibold text-foreground" style="font-size: 20px; line-height: 1;">
        <svg lucideSparkles class="size-6 text-primary"></svg>
        <span>{{ 'ai.title' | transloco }}</span>
      </div>

      <!-- Photo previews -->
      @if (images().length > 0) {
        <div class="flex flex-wrap gap-2" style="margin-top: 12px;">
          @for (img of images(); track img.dataUrl; let i = $index) {
            <div class="relative">
              <img [src]="img.dataUrl" alt="" class="size-20 object-cover rounded border border-border" />
              <button type="button" class="absolute -top-1.5 -right-1.5 size-6 rounded-full bg-destructive text-white text-sm leading-none" (click)="removeImage(i)">×</button>
            </div>
          }
        </div>
      }

      <!-- Recording indicator -->
      @if (recording()) {
        <div class="flex items-center gap-2" style="margin-top: 12px;">
          <span class="ai-recording-dot" aria-hidden="true"></span>
          <span class="text-destructive" style="font-size: 1.05rem;">{{ 'ai.recording' | transloco }}</span>
        </div>
      }

      <!-- Voice note preview -->
      @if (audio()) {
        <div class="flex items-center gap-2 rounded-md border border-border px-3 py-2" style="margin-top: 12px; background: var(--muted);">
          <svg lucideMic class="size-5 text-primary"></svg>
          <span class="text-foreground" style="font-size: 1rem;">{{ 'ai.voiceAdded' | transloco }}</span>
          <span class="text-sm text-muted-foreground">{{ formatDuration(audio()!.duration) }}</span>
          <button type="button" class="ai-voice-play" (click)="playAudio()" [attr.aria-label]="'ai.playVoice' | transloco">
            <svg lucideVolume2 class="size-5"></svg>
          </button>
          <div class="flex-1"></div>
          <button type="button" class="ai-voice-remove" (click)="removeAudio()" [attr.aria-label]="'ai.removeVoice' | transloco">
            <svg lucideX class="size-5"></svg>
          </button>
        </div>
      }

      <!-- Recording error -->
      @if (recordingError()) {
        <p class="text-base text-destructive" style="margin-top: 10px; font-size: 1rem;">{{ recordingError() | transloco }}</p>
      }

      <!-- Prompt -->
      <textarea
        [(ngModel)]="prompt"
        class="w-full border border-border rounded-md bg-transparent px-3 py-3 text-base text-foreground"
        style="margin-top: 14px; min-height: 110px; font-size: 1.05rem;"
        [placeholder]="'ai.placeholder' | transloco"
        (keydown.meta.enter)="submit()"
        (keydown.ctrl.enter)="submit()"
      ></textarea>

      <!-- Progress -->
      @if (running()) {
        <div class="flex items-center gap-2 text-base text-muted-foreground" style="margin-top: 10px;">
          <span class="animate-pulse" style="font-size: 1.05rem;">{{ status() | transloco }}</span>
        </div>
      }
      @if (stream()) {
        <p class="text-sm text-muted-foreground truncate" style="margin-top: 8px;">{{ stream() }}</p>
      }
      @if (error()) {
        <p class="text-base text-destructive" style="margin-top: 10px; font-size: 1rem;">{{ error() }}</p>
      }
      @if (done()) {
        <p class="text-base text-primary" style="margin-top: 10px; font-size: 1rem;">{{ 'ai.applied' | transloco }}</p>
      }

      <!-- Actions -->
      <div class="flex items-center gap-2" style="margin-top: 14px; flex-wrap: wrap;">
        <button hlmBtn size="default" variant="outline" type="button" class="text-foreground" style="font-size: 1rem;" (click)="onToggleRecord()" [disabled]="running()">
          @if (recording()) {
            <svg lucideSquare class="size-5 mr-1 text-destructive"></svg>
            {{ 'ai.stopRecording' | transloco }}
          } @else {
            <svg lucideMic class="size-5 mr-1"></svg>
            {{ 'ai.recordVoice' | transloco }}
          }
        </button>
        <button hlmBtn size="default" variant="outline" type="button" class="text-foreground" style="font-size: 1rem;" (click)="onSelectPhotos()" [disabled]="running()">
          <svg lucideImage class="size-5 mr-1"></svg>
          {{ 'ai.addPhotos' | transloco }}
        </button>
        <div class="flex-1"></div>
        <button hlmBtn size="default" type="button" style="font-size: 1rem;" (click)="submit()" [disabled]="running() || (!prompt().trim() && images().length === 0 && !audio())">
          <svg lucideSend class="size-5 mr-1"></svg>
          {{ 'ai.send' | transloco }}
        </button>
      </div>

      <input #fileInput type="file" accept="image/*" multiple class="hidden" (change)="onFilesSelected($event)" />
    </ng-template>
  `,
  styles: [`
    .ai-recording-dot {
      width: 0.8rem;
      height: 0.8rem;
      border-radius: 9999px;
      background: var(--destructive);
      animation: aiPulse 1s ease-in-out infinite;
    }
    @keyframes aiPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.25; }
    }
    .ai-voice-play,
    .ai-voice-remove {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.1rem;
      height: 2.1rem;
      border-radius: 9999px;
      border: none;
      background: transparent;
      color: var(--foreground);
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .ai-voice-play:hover,
    .ai-voice-remove:hover {
      background: var(--secondary);
    }
  `],
})
export class AiAssistantPanelComponent implements OnDestroy {
  private readonly flow = inject(AiFlowService);
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  /** Scenario key used for text-only requests. */
  readonly textScenarioKey = input.required<string>();

  /** Scenario key used when photos are attached. Falls back to the text key. */
  readonly photosScenarioKey = input<string>();

  /** The current form context (existing values for edit; {} for create). */
  readonly context = input<Record<string, unknown>>({});

  /** When true (default) the panel is wrapped in its own bordered frame. */
  readonly framed = input(true);

  /** Emits the validated form proposal when the flow completes. */
  readonly proposal = output<Record<string, unknown>>();

  /** Emits true while an AI request is running, false when it settles. */
  readonly busy = output<boolean>();

  readonly prompt = signal('');
  readonly images = signal<{ name: string; dataUrl: string }[]>([]);
  readonly running = signal(false);
  readonly status = signal('ai.filling');
  readonly stream = signal('');
  readonly error = signal<string | null>(null);
  readonly done = signal(false);

  // ── Voice recording state ────────────────────────────────────────────────
  readonly recording = signal(false);
  readonly recordingError = signal<string | null>(null);
  readonly audio = signal<{ name: string; dataUrl: string; duration: number; mime: string } | null>(null);
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaChunks: Blob[] = [];
  private recordingStartedAt = 0;
  private destroyed = false;

  onSelectPhotos(): void {
    this.fileInput()?.nativeElement.click();
  }

  async onFilesSelected(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const files = Array.from(target.files ?? []);
    for (const file of files) {
      const dataUrl = await readFileAsDataUrl(file);
      this.images.update((current) => [...current, { name: file.name, dataUrl }]);
    }
    target.value = '';
  }

  removeImage(index: number): void {
    this.images.update((current) => current.filter((_, i) => i !== index));
  }

  // ── Voice recording ──────────────────────────────────────────────────────

  /** Start or stop a voice recording (mic button toggle). */
  async onToggleRecord(): Promise<void> {
    if (this.recording()) {
      this.stopRecording();
      return;
    }
    await this.startRecording();
  }

  private async startRecording(): Promise<void> {
    if (this.running()) return;
    this.recordingError.set(null);
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
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) this.mediaChunks.push(event.data);
      };
      recorder.onstop = () => this.finishRecording(recorder, stream);
      recorder.onerror = () => {
        this.recording.set(false);
        this.recordingError.set('ai.voiceError');
      };
      recorder.start();
      this.recording.set(true);
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
    if (this.destroyed) return;

    const duration = (Date.now() - this.recordingStartedAt) / 1000;
    const mime = recorder.mimeType || 'audio/webm';
    const blob = new Blob(this.mediaChunks, { type: mime });
    try {
      // Send the raw recorded bytes with their true media type — the backend
      // transcribes WebM/MP4/OGG directly; no client-side re-encode needed.
      const dataUrl = await blobToDataUrl(blob);
      this.audio.set({ name: audioFileName(mime), dataUrl, duration, mime });
    } catch {
      this.recordingError.set('ai.voiceError');
    }
  }

  removeAudio(): void {
    this.audio.set(null);
  }

  /** Quick preview of the recorded voice note. */
  playAudio(): void {
    const audio = this.audio();
    if (!audio) return;
    const element = new Audio(audio.dataUrl);
    void element.play().catch(() => undefined);
  }

  formatDuration(seconds: number): string {
    const total = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(total / 60);
    const rest = total % 60;
    return `${minutes}:${rest.toString().padStart(2, '0')}`;
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  async submit(): Promise<void> {
    const prompt = this.prompt().trim();
    const images = this.images();
    const audio = this.audio();
    if (this.running() || (!prompt && images.length === 0 && !audio)) return;

    const hasPhotos = images.length > 0;
    const scenarioKey = hasPhotos
      ? (this.photosScenarioKey() ?? this.textScenarioKey())
      : this.textScenarioKey();

    this.running.set(true);
    this.busy.emit(true);
    this.done.set(false);
    this.error.set(null);
    this.stream.set('');
    this.status.set(hasPhotos ? 'ai.analyzing' : 'ai.filling');

    const parts: AiContentPart[] = [
      ...images.map((img) => ({ type: 'image', url: img.dataUrl }) as AiContentPart),
      ...(audio ? [{ type: 'audio', url: audio.dataUrl, mime: audio.mime } as AiContentPart] : []),
    ];
    const input: Record<string, unknown> = { userPrompt: prompt, current: this.context() };

    let outcome;
    try {
      outcome = await this.flow.runScenario(scenarioKey, input, parts, (evt) => this.handleEvent(evt));
    } catch (err) {
      this.running.set(false);
      this.busy.emit(false);
      this.status.set('ai.filling');
      this.error.set(err instanceof Error ? err.message : 'ai.failed');
      return;
    }

    this.running.set(false);
    this.busy.emit(false);
    this.status.set('ai.filling');

    if (outcome.kind === 'error') {
      this.error.set(outcome.message);
      return;
    }

    const finalOutput = outcome.finalOutput;
    if (finalOutput && typeof finalOutput === 'object' && !Array.isArray(finalOutput)) {
      this.proposal.emit(finalOutput as Record<string, unknown>);
      this.done.set(true);
    } else {
      this.error.set('ai.invalid');
    }
  }

  private handleEvent(event: AiFlowEvent): void {
    switch (event.kind) {
      case 'step_started':
        this.status.set(event.name === 'fill_form' ? 'ai.filling' : 'ai.analyzing');
        break;
      case 'step_retry':
        this.status.set('ai.correcting');
        break;
      case 'token':
        this.stream.update((current) => current + (event.delta ?? ''));
        break;
      default:
        break;
    }
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
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
