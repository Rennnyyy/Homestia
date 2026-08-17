import { Component, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmButton } from '@spartan-ng/helm/button';
import { LucideSparkles, LucideImage, LucideSend } from '@lucide/angular';
import { AiFlowService, type AiContentPart, type AiFlowEvent } from '../../../core/ai/ai-flow.service';

/**
 * AiAssistantPanel — the visible face of AI-assisted form filling.
 *
 * Paths A (chat) and B (photos) both flow through here: the panel collects a
 * free-text prompt and optional photos, streams the scenario's progress, and
 * emits the validated form proposal so the parent can render it in review.
 */
@Component({
  selector: 'app-ai-assistant-panel',
  standalone: true,
  imports: [FormsModule, TranslocoPipe, HlmButton, LucideSparkles, LucideImage, LucideSend],
  template: `
    <div class="border border-border rounded-lg px-4 py-3" style="margin: 16px 0;">
      <div class="flex items-center gap-2 font-semibold text-foreground" style="font-size: 18px; line-height: 1;">
        <svg lucideSparkles class="size-5 text-primary"></svg>
        <span>{{ 'ai.title' | transloco }}</span>
      </div>

      <!-- Photo previews -->
      @if (images().length > 0) {
        <div class="flex flex-wrap gap-2" style="margin-top: 12px;">
          @for (img of images(); track img.dataUrl; let i = $index) {
            <div class="relative">
              <img [src]="img.dataUrl" alt="" class="size-16 object-cover rounded border border-border" />
              <button type="button" class="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-destructive text-white text-xs leading-none" (click)="removeImage(i)">×</button>
            </div>
          }
        </div>
      }

      <!-- Prompt -->
      <textarea
        [(ngModel)]="prompt"
        class="w-full border border-border rounded-md bg-transparent px-3 py-2 text-sm text-foreground"
        style="margin-top: 12px; min-height: 64px;"
        [placeholder]="'ai.placeholder' | transloco"
        (keydown.meta.enter)="submit()"
        (keydown.ctrl.enter)="submit()"
      ></textarea>

      <!-- Progress -->
      @if (running()) {
        <div class="flex items-center gap-2 text-sm text-muted-foreground" style="margin-top: 8px;">
          <span class="animate-pulse">{{ status() | transloco }}</span>
        </div>
      }
      @if (stream()) {
        <p class="text-xs text-muted-foreground truncate" style="margin-top: 8px;">{{ stream() }}</p>
      }
      @if (error()) {
        <p class="text-sm text-destructive" style="margin-top: 8px;">{{ error() }}</p>
      }
      @if (done()) {
        <p class="text-sm text-primary" style="margin-top: 8px;">{{ 'ai.applied' | transloco }}</p>
      }

      <!-- Actions -->
      <div class="flex items-center gap-2" style="margin-top: 12px;">
        <button hlmBtn size="sm" variant="outline" type="button" (click)="onSelectPhotos()" [disabled]="running()">
          <svg lucideImage class="size-4 mr-1"></svg>
          {{ 'ai.addPhotos' | transloco }}
        </button>
        <div class="flex-1"></div>
        <button hlmBtn size="sm" type="button" (click)="submit()" [disabled]="running() || (!prompt().trim() && images().length === 0)">
          <svg lucideSend class="size-4 mr-1"></svg>
          {{ 'ai.send' | transloco }}
        </button>
      </div>

      <input #fileInput type="file" accept="image/*" multiple class="hidden" (change)="onFilesSelected($event)" />
    </div>
  `,
})
export class AiAssistantPanelComponent {
  private readonly flow = inject(AiFlowService);
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  /** Scenario key used for text-only requests. */
  readonly textScenarioKey = input.required<string>();

  /** Scenario key used when photos are attached. Falls back to the text key. */
  readonly photosScenarioKey = input<string>();

  /** The current form context (existing values for edit; {} for create). */
  readonly context = input<Record<string, unknown>>({});

  /** Emits the validated form proposal when the flow completes. */
  readonly proposal = output<Record<string, unknown>>();

  readonly prompt = signal('');
  readonly images = signal<{ name: string; dataUrl: string }[]>([]);
  readonly running = signal(false);
  readonly status = signal('ai.filling');
  readonly stream = signal('');
  readonly error = signal<string | null>(null);
  readonly done = signal(false);

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

  async submit(): Promise<void> {
    const prompt = this.prompt().trim();
    const images = this.images();
    if (this.running() || (!prompt && images.length === 0)) return;

    const hasPhotos = images.length > 0;
    const scenarioKey = hasPhotos
      ? (this.photosScenarioKey() ?? this.textScenarioKey())
      : this.textScenarioKey();

    this.running.set(true);
    this.done.set(false);
    this.error.set(null);
    this.stream.set('');
    this.status.set(hasPhotos ? 'ai.analyzing' : 'ai.filling');

    const parts: AiContentPart[] = images.map((img) => ({ type: 'image', url: img.dataUrl }));
    const input: Record<string, unknown> = { userPrompt: prompt, current: this.context() };

    let outcome;
    try {
      outcome = await this.flow.runScenario(scenarioKey, input, parts, (evt) => this.handleEvent(evt));
    } catch (err) {
      this.running.set(false);
      this.status.set('ai.filling');
      this.error.set(err instanceof Error ? err.message : 'ai.failed');
      return;
    }

    this.running.set(false);
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
