import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AiFlowService, type AiFlowEvent } from './ai-flow.service';

/** Builds a fetch mock whose body streams one SSE payload chunk and then closes. */
function sseFetchMock(frames: string, status = 200) {
  const encoder = new TextEncoder();
  const data = encoder.encode(frames);

  const body = {
    getReader() {
      let sent = false;
      return {
        read: async () => {
          if (sent) return { done: true, value: undefined };
          sent = true;
          return { done: false, value: data };
        },
      };
    },
  };

  const fetchMock = vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    body,
  } as unknown as Response);

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('AiFlowService', () => {
  let service: AiFlowService;

  beforeEach(() => {
    service = new AiFlowService();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('streams every SSE event and resolves the validated final output', async () => {
    const frames =
      'event: step_started\ndata: {"step":0,"name":"fill_form"}\n\n' +
      'event: token\ndata: {"step":0,"delta":"Berlin"}\n\n' +
      'event: flow_completed\ndata: {"finalOutput":{"name":"Berlin Flat","address":"Hauptstr. 1, 10115 Berlin"}}\n\n';

    sseFetchMock(frames);

    const kinds: string[] = [];
    const outcome = await service.runScenario(
      'property.create.text',
      { userPrompt: 'flat in Berlin' },
      [],
      (event: AiFlowEvent) => kinds.push(event.kind),
    );

    expect(kinds).toEqual(['step_started', 'token', 'flow_completed']);
    expect(outcome.kind).toBe('completed');
    expect((outcome as { finalOutput: Record<string, unknown> }).finalOutput).toMatchObject({
      name: 'Berlin Flat',
    });
  });

  it('resolves an error outcome when the flow ends without a completed event', async () => {
    const frames = 'event: error\ndata: {"message":"Step \'fill_form\' failed after 4 attempt(s)"}\n\n';
    sseFetchMock(frames);

    const outcome = await service.runScenario('property.create.text', {}, [], () => {});

    expect(outcome.kind).toBe('error');
    expect((outcome as { message: string }).message).toContain('failed after 4 attempt(s)');
  });

  it('POSTs the scenario key, input, and multimodal parts to the flow endpoint', async () => {
    const frames = 'event: flow_completed\ndata: {"finalOutput":{}}\n\n';
    const fetchMock = sseFetchMock(frames);

    await service.runScenario(
      'property.create.photos',
      { userPrompt: 'flat', current: {} },
      [{ type: 'image', url: 'data:image/png;base64,xxxx' }],
      () => {},
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/ai/flow');
    expect(init.method).toBe('POST');

    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body['scenarioKey']).toBe('property.create.photos');
    expect(body['stream']).toBe(true);
    expect(body['input']).toMatchObject({ userPrompt: 'flat' });
    expect(body['parts']).toEqual([{ type: 'image', url: 'data:image/png;base64,xxxx' }]);
  });
});
