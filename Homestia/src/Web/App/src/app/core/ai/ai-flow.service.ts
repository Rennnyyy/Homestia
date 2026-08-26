import { Injectable } from '@angular/core';

/** A multimodal content part sent to the AI flow endpoint. */
export interface AiContentPart {
  type: 'text' | 'image' | 'audio';
  text?: string;
  url?: string;
  /** Media type of the referenced payload (e.g. 'audio/webm' for audio parts). */
  mime?: string;
}

/** SSE event kinds emitted by POST /api/ai/flow. */
export type AiFlowEventKind =
  | 'step_started'
  | 'token'
  | 'tool_call'
  | 'tool_result'
  | 'step_retry'
  | 'step_completed'
  | 'flow_completed'
  | 'error';

/** A parsed SSE event, flattened to camelCase fields. */
export interface AiFlowEvent {
  kind: AiFlowEventKind;
  step?: number;
  name?: string;
  delta?: string;
  attempt?: number;
  reason?: string;
  output?: unknown;
  finalOutput?: unknown;
  message?: string;
}

/** Terminal result of a scenario run. */
export type AiFlowOutcome =
  | { kind: 'completed'; finalOutput: unknown }
  | { kind: 'error'; message: string };

/**
 * AiFlowService — streams a scenario flow from POST /api/ai/flow over SSE and
 * hands every event to the caller. The caller renders progress; this service
 * only resolves the terminal outcome (validated final output or failure).
 */
@Injectable({ providedIn: 'root' })
export class AiFlowService {
  async runScenario(
    scenarioKey: string,
    input: Record<string, unknown>,
    parts: AiContentPart[],
    onEvent: (event: AiFlowEvent) => void,
    signal?: AbortSignal,
  ): Promise<AiFlowOutcome> {
    const response = await fetch('/api/ai/flow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioKey, input, parts, stream: true }),
      signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`AI flow request failed: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalOutput: unknown;
    let lastError: string | null = null;

    const dispatch = (eventName: string, data: string) => {
      const kind = eventName as AiFlowEventKind;
      let payload: Record<string, unknown> = {};
      if (data && data !== '[DONE]') {
        try {
          payload = JSON.parse(data) as Record<string, unknown>;
        } catch {
          return;
        }
      }

      if (kind === 'flow_completed') {
        finalOutput = payload['finalOutput'];
      } else if (kind === 'error') {
        lastError = (payload['message'] as string) ?? 'Unknown AI error.';
      }

      onEvent({ kind, ...payload } as AiFlowEvent);
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let separator: number;
      while ((separator = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);

        let eventName = '';
        let dataLine = '';
        for (const line of frame.split('\n')) {
          if (line.startsWith('event:')) eventName = line.slice(6).trim();
          else if (line.startsWith('data:')) dataLine = line.slice(5).trim();
        }

        if (dataLine) dispatch(eventName, dataLine);
      }
    }

    if (finalOutput !== undefined) {
      return { kind: 'completed', finalOutput };
    }
    return { kind: 'error', message: lastError ?? 'The AI flow produced no output.' };
  }
}
