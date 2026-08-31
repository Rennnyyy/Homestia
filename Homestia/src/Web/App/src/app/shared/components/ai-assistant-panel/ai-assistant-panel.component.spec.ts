/**
 * Unit tests for AiAssistantPanelComponent — verifies the voice recording
 * lifecycle: mic capture → raw (WebM) data URL with its real media type →
 * audio content part sent to the AI flow endpoint (text + voice input). The
 * backend transcribes; no client-side re-encode.
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
import { TestBed, type ComponentFixture } from '@angular/core/testing';
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
  let fixture: ComponentFixture<AiAssistantPanelComponent>;

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

    fixture = TestBed.createComponent(AiAssistantPanelComponent);
    fixture.componentRef.setInput('textScenarioKey', 'property.create.text');
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

  it('stops recording and immediately sends the voice note (auto-send)', async () => {
    await component.onToggleRecord(); // start
    await component.onToggleRecord(); // stop → auto-send
    await vi.waitFor(() => expect(flowMock.runScenario).toHaveBeenCalledTimes(1));

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

  it('keeps the voice note attached after it is sent', async () => {
    await component.onToggleRecord();
    await component.onToggleRecord();
    await vi.waitFor(() => expect(component.audio()).not.toBeNull());
    await vi.waitFor(() => expect(flowMock.runScenario).toHaveBeenCalledTimes(1));

    expect(component.audio()!.mime).toBe('audio/webm');
    expect(component.audio()!.duration).toBeGreaterThanOrEqual(0);
    // The note stays attached after the flow settles so the user sees it was captured.
    expect(component.audio()).not.toBeNull();
  });

  it('shows a friendly summary when the AI flow completes', async () => {
    flowMock.runScenario.mockResolvedValueOnce({
      kind: 'completed',
      finalOutput: { name: 'Flat', address: 'Main St 1', rooms: [] },
    });
    component.prompt.set('a flat');
    await component.submit();
    expect(component.failed()).toBe(false);
    expect(component.summary()).toBeTruthy();
  });

  it('shows only a friendly summary when the AI flow fails', async () => {
    flowMock.runScenario.mockResolvedValueOnce({
      kind: 'error',
      message: 'Step fill_form failed after 4 attempt(s): some raw error',
    });
    component.prompt.set('a flat');
    await component.submit();
    expect(component.failed()).toBe(true);
    expect(component.summary()).toBeTruthy();
    // The raw error text is never surfaced to the user.
    expect(component.summary()).not.toContain('fill_form');
  });

  it('routes to the edit scenario when the AI detects an edit of an existing property', async () => {
    fixture.componentRef.setInput('existingProperties', [
      { iri: 'prop-1', name: 'Flat Berlin', address: 'Main St 1' },
    ]);
    fixture.componentRef.setInput('editTextScenarioKey', 'property.edit.text');
    fixture.componentRef.setInput('intentTextScenarioKey', 'property.intent.text');

    flowMock.runScenario
      .mockResolvedValueOnce({ kind: 'completed', finalOutput: { intent: 'edit', propertyIri: 'prop-1' } })
      .mockResolvedValueOnce({ kind: 'completed', finalOutput: { name: 'Edited Flat', address: 'Main St 1' } });

    const emitted: (string | null)[] = [];
    component.editIri.subscribe((value) => emitted.push(value));

    component.prompt.set('change the rent of Flat Berlin');
    await component.submit();

    expect(flowMock.runScenario).toHaveBeenCalledTimes(2);
    // First call = intent detection, second = the edit fill with the property as context.
    const intentCall = flowMock.runScenario.mock.calls[0] as [string, Record<string, unknown>, AiContentPart[]];
    const editCall = flowMock.runScenario.mock.calls[1] as [string, Record<string, unknown>, AiContentPart[]];
    expect(intentCall[0]).toBe('property.intent.text');
    expect(intentCall[1]).toEqual(
      expect.objectContaining({ properties: [{ iri: 'prop-1', name: 'Flat Berlin', address: 'Main St 1' }] }),
    );
    expect(editCall[0]).toBe('property.edit.text');
    expect(editCall[1]).toEqual(expect.objectContaining({ current: expect.objectContaining({ iri: 'prop-1' }) }));
    expect(emitted).toEqual(['prop-1']);
    expect(component.pickProperty()).toBe(false);
  });

  it('shows the property picker when an edit is intended but nothing matched', async () => {
    fixture.componentRef.setInput('existingProperties', [
      { iri: 'prop-1', name: 'Flat Berlin', address: 'Main St 1' },
    ]);
    fixture.componentRef.setInput('intentTextScenarioKey', 'property.intent.text');

    flowMock.runScenario.mockResolvedValueOnce({
      kind: 'completed',
      finalOutput: { intent: 'edit', propertyIri: '' },
    });

    component.prompt.set('change something');
    await component.submit();

    expect(flowMock.runScenario).toHaveBeenCalledTimes(1);
    expect(component.pickProperty()).toBe(true);
  });

  it('continues a draft via the complete scenario when "Ask again" provides one', async () => {
    fixture.componentRef.setInput('draft', { name: 'Sunny Studio', address: '', rooms: [] });
    fixture.componentRef.setInput('draftIri', null);
    fixture.componentRef.setInput('completeTextScenarioKey', 'property.complete.text');
    fixture.componentRef.setInput('intentTextScenarioKey', 'property.intent.text');

    flowMock.runScenario.mockResolvedValueOnce({
      kind: 'completed',
      finalOutput: { name: 'Sunny Studio', address: 'Main St 1', rooms: [] },
    });

    const emitted: (string | null)[] = [];
    component.editIri.subscribe((value) => emitted.push(value));

    component.prompt.set('add address Main St 1');
    await component.submit();

    // No intent detection call — the draft is a continuation, not create-vs-edit.
    expect(flowMock.runScenario).toHaveBeenCalledTimes(1);
    const call = flowMock.runScenario.mock.calls[0] as [string, Record<string, unknown>, AiContentPart[]];
    expect(call[0]).toBe('property.complete.text');
    expect(call[1]).toEqual(
      expect.objectContaining({ current: expect.objectContaining({ name: 'Sunny Studio' }) }),
    );
    // A create draft has no property IRI → editIri stays null.
    expect(emitted).toEqual([null]);
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
