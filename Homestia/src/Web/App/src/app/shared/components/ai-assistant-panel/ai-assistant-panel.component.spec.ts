/**
 * Unit tests for AiAssistantPanelComponent — verifies the voice recording
 * lifecycle: mic capture → raw (WebM) data URL with its real media type →
 * audio content part sent to the AI flow endpoint (multi-dimension input:
 * text + image + audio). The backend transcribes; no client-side re-encode.
 *
 * Regression: the fake MediaRecorder reports a parameterized mime
 * ("audio/webm;codecs=opus", as real browsers do) — the panel must normalize
 * it to the bare "audio/webm" so the backend never sees "codecs" or a
 * ".wav"-labeled WebM.
 *
 * Browser APIs (MediaRecorder, getUserMedia) are stubbed so the recording
 * logic runs deterministically in jsdom.
 */
import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideTransloco, TranslocoLoader } from '@jsverse/transloco';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AiAssistantPanelComponent } from './ai-assistant-panel.component';
import { AiFlowService, type AiContentPart } from '../../../core/ai/ai-flow.service';

/** Inline mock loader — returns empty translations so keys render as-is. */
@Injectable()
class MockTranslocoLoader implements TranslocoLoader {
  getTranslation() {
    return of({});
  }
}

/** Fake MediaRecorder that emits one WebM chunk on stop. */
class FakeMediaRecorder {
  static isTypeSupported = () => true;
  state = 'inactive';
  mimeType = 'audio/webm;codecs=opus';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(_stream: MediaStream, _options?: MediaRecorderOptions) {}

  start(): void {
    this.state = 'recording';
  }

  stop(): void {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['fake-audio'], { type: 'audio/webm;codecs=opus' }) });
    this.onstop?.();
  }
}

describe('AiAssistantPanelComponent — voice input', () => {
  let flowMock: { runScenario: ReturnType<typeof vi.fn> };
  let component: AiAssistantPanelComponent;

  beforeEach(async () => {
    // Stub browser media APIs.
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    const fakeStream = { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream;
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue(fakeStream) },
      configurable: true,
    });

    flowMock = { runScenario: vi.fn().mockResolvedValue({ kind: 'completed', finalOutput: { name: 'Flat' } }) };

    await TestBed.configureTestingModule({
      imports: [AiAssistantPanelComponent],
      providers: [
        provideHttpClient(),
        provideTransloco({
          config: { availableLangs: ['en'], defaultLang: 'en', fallbackLang: 'en' },
          loader: MockTranslocoLoader,
        }),
        { provide: AiFlowService, useValue: flowMock },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AiAssistantPanelComponent);
    fixture.componentRef.setInput('textScenarioKey', 'property.create.text');
    fixture.componentRef.setInput('photosScenarioKey', 'property.create.photos');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('records a voice note and exposes it as a raw WebM data URL with its mime type', async () => {
    await component.onToggleRecord(); // start
    expect(component.recording()).toBe(true);

    await component.onToggleRecord(); // stop
    // finishRecording is async (FileReader data URL) — flush it.
    await vi.waitFor(() => expect(component.audio()).not.toBeNull());

    const audio = component.audio()!;
    expect(audio.name).toBe('voice.webm');
    expect(audio.mime).toBe('audio/webm');
    expect(audio.dataUrl.startsWith('data:audio/webm;base64,')).toBe(true);
    // Regression: the recorder's "codecs" parameter must not leak through.
    expect(audio.dataUrl).not.toContain('codecs');
    expect(component.recording()).toBe(false);
  });

  it('sends the recorded voice as an audio content part alongside text', async () => {
    await component.onToggleRecord();
    await component.onToggleRecord();
    await vi.waitFor(() => expect(component.audio()).not.toBeNull());

    component.prompt.set('near the park');
    await component.submit();

    const [scenarioKey, , parts] = flowMock.runScenario.mock.calls[0] as [
      string,
      Record<string, unknown>,
      AiContentPart[],
    ];
    expect(scenarioKey).toBe('property.create.text');
    expect(parts).toContainEqual(
      expect.objectContaining({ type: 'audio', mime: 'audio/webm' }),
    );
    expect(parts.find((p) => p.type === 'audio')?.url).toMatch(/^data:audio\/webm;base64,/);
  });

  it('allows submitting with voice only (no text prompt)', async () => {
    await component.onToggleRecord();
    await component.onToggleRecord();
    await vi.waitFor(() => expect(component.audio()).not.toBeNull());

    await component.submit();
    expect(flowMock.runScenario).toHaveBeenCalledTimes(1);
  });

  it('shows a friendly error when the microphone is unavailable', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockRejectedValue(new Error('NotAllowedError')) },
      configurable: true,
    });

    await component.onToggleRecord();
    expect(component.recording()).toBe(false);
    expect(component.recordingError()).toBe('ai.voiceUnsupported');
  });
});
