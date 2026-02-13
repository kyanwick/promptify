/**
 * Anthropic Claude Provider Implementation
 * Supports Claude 3 and other Anthropic models
 */

import { BaseAIProvider } from './base-provider';
import {
  AIProvider,
  Message,
  StreamChunk,
  ChatOptions,
  AIProviderResponse,
  AIProviderConfig,
} from './types';

const AVAILABLE_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
];

export class AnthropicProvider extends BaseAIProvider {
  name: AIProvider = 'anthropic';
  private apiEndpoint: string;

  constructor(config: AIProviderConfig) {
    super(config);
    this.apiEndpoint = config.baseURL || 'https://api.anthropic.com/v1';
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const response = await fetch(`${this.apiEndpoint}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }],
        }),
        signal: AbortSignal.timeout(5000),
      });
      return response.ok || response.status === 400; // 400 is ok, just means we need valid input
    } catch {
      return false;
    }
  }

  async chat(messages: Message[], options: ChatOptions): Promise<AIProviderResponse> {
    this.validateMessages(messages);
    this.validateOptions(options);

    // Convert messages to Anthropic format
    const { system, anthropicMessages } = this.convertMessages(messages);

    try {
      const requestBody: any = {
        model: options.model,
        max_tokens: options.maxTokens || 4096,
        messages: anthropicMessages,
        temperature: options.temperature ?? 0.7,
      };

      if (system) {
        requestBody.system = system;
      }

      if (options.topP !== undefined) {
        requestBody.top_p = options.topP;
      }

      const response = await fetch(`${this.apiEndpoint}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return {
        content: data.content[0]?.text || '',
        model: data.model,
        usage: {
          promptTokens: data.usage?.input_tokens || 0,
          completionTokens: data.usage?.output_tokens || 0,
          totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        },
        finishReason: data.stop_reason,
      };
    } catch (error) {
      throw new Error(`Anthropic chat error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async chatStream(
    messages: Message[],
    options: ChatOptions,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<void> {
    this.validateMessages(messages);
    this.validateOptions(options);

    const { system, anthropicMessages } = this.convertMessages(messages);

    try {
      onChunk({ type: 'start' });

      const requestBody: any = {
        model: options.model,
        max_tokens: options.maxTokens || 4096,
        messages: anthropicMessages,
        temperature: options.temperature ?? 0.7,
        stream: true,
      };

      if (system) {
        requestBody.system = system;
      }

      if (options.topP !== undefined) {
        requestBody.top_p = options.topP;
      }

      const response = await fetch(`${this.apiEndpoint}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === 'content_block_delta') {
                const content = parsed.delta?.text || '';
                if (content) {
                  onChunk({ type: 'text', content });
                }
              } else if (parsed.type === 'message_stop') {
                onChunk({ type: 'end' });
              } else if (parsed.type === 'error') {
                onChunk({ type: 'error', error: parsed.error?.message || 'Unknown error' });
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      onChunk({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown streaming error',
      });
    }
  }

  async listModels(): Promise<string[]> {
    // Anthropic doesn't have a public models list endpoint
    return AVAILABLE_MODELS;
  }

  getAvailableModels(): string[] {
    return AVAILABLE_MODELS;
  }

  private convertMessages(messages: Message[]): {
    system?: string;
    anthropicMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  } {
    let system: string | undefined;
    const anthropicMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        // Anthropic uses a separate system parameter
        system = msg.content;
      } else {
        anthropicMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    return { system, anthropicMessages };
  }
}
