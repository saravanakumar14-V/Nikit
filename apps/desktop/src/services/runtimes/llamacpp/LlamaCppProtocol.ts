import { GenerationRequest, GenerationEvent, Message } from '@nikit/types';

/**
 * Llama.cpp SSE Streaming Protocol Adapter.
 * Tested with llama.cpp server OpenAI-compatible endpoint: /v1/chat/completions
 * Strictly translates SSE events into Nikit's GenerationEvent format.
 */
export class LlamaCppProtocol {
  /**
   * Generates streaming events from llama-server.
   */
  static async *streamChat(
    baseUrl: string,
    request: GenerationRequest
  ): AsyncIterable<GenerationEvent> {
    const startTime = Date.now();
    let firstTokenTime: number | null = null;
    let accumulatedText = '';
    const messageId = `msg-llamacpp-${Date.now()}`;

    // 1. Initial started event
    yield {
      type: 'started',
      messageId,
      modelId: request.modelId,
    };

    // Format chat messages
    const formattedMessages = request.messages.map((m: Message) => ({
      role: m.role,
      content: m.parts.map((p) => (p.type === 'text' ? p.content : '')).join('\n'),
    }));

    const payload = {
      model: request.modelId,
      messages: formattedMessages,
      stream: true,
      temperature: request.options?.temperature ?? 0.7,
      top_p: request.options?.topP ?? 0.9,
      max_tokens: request.options?.maxTokens ?? 2048,
      stop: request.options?.stopSequences && request.options.stopSequences.length > 0
        ? request.options.stopSequences
        : undefined,
    };

    let promptTokens: number | undefined;
    let completionTokens: number | undefined;

    try {
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(payload),
        signal: request.abortSignal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(
          `llama-server HTTP error (${response.status} ${response.statusText}): ${errorText}`
        );
      }

      if (!response.body) {
        throw new Error('Response body is null from llama-server');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        if (request.abortSignal?.aborted) {
          yield {
            type: 'cancelled',
            messageId,
            partialContent: accumulatedText,
          };
          return;
        }

        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed === 'data: [DONE]') {
            break;
          }

          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            try {
              const data = JSON.parse(dataStr);

              // Extract token usage if reported by server
              if (data.usage) {
                promptTokens = data.usage.prompt_tokens;
                completionTokens = data.usage.completion_tokens;
              }

              const deltaContent = data.choices?.[0]?.delta?.content;
              if (deltaContent) {
                if (firstTokenTime === null) {
                  firstTokenTime = Date.now();
                }
                accumulatedText += deltaContent;

                yield {
                  type: 'delta',
                  messageId,
                  textDelta: deltaContent,
                };
              }
            } catch {
              // Ignore malformed SSE lines
            }
          }
        }
      }

      const totalDurationMs = Date.now() - startTime;
      const ttftMs = firstTokenTime ? firstTokenTime - startTime : undefined;

      let tokensPerSecond: number | undefined;
      if (completionTokens && totalDurationMs > 0) {
        tokensPerSecond = Number(((completionTokens / totalDurationMs) * 1000).toFixed(2));
      }

      yield {
        type: 'completed',
        messageId,
        finalContent: accumulatedText,
        telemetry: {
          isPrototypeData: false,
          timeToFirstTokenMs: ttftMs,
          tokensPerSecond,
          promptTokens,
          completionTokens,
        },
      };
    } catch (err: unknown) {
      if (request.abortSignal?.aborted) {
        yield {
          type: 'cancelled',
          messageId,
          partialContent: accumulatedText,
        };
        return;
      }

      const errorMsg = err instanceof Error ? err.message : String(err);
      yield {
        type: 'error',
        messageId,
        error: {
          code: 'LLAMACPP_STREAM_ERROR',
          message: errorMsg,
        },
      };
    }
  }
}
