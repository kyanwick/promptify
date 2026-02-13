/**
 * OpenAI Provider Implementation
 * Supports ChatGPT, GPT-4, and other OpenAI models
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
  'gpt-4-turbo',
  'gpt-4',
  'gpt-3.5-turbo',
  'gpt-3.5-turbo-16k',
];

export class OpenAIProvider extends BaseAIProvider {
  name: AIProvider = 'openai';
  private apiEndpoint: string;

  constructor(config: AIProviderConfig) {
    super(config);
    this.apiEndpoint = config.baseURL || 'https://api.openai.com/v1';
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const response = await fetch(`${this.apiEndpoint}/models/gpt-3.5-turbo`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async chat(messages: Message[], options: ChatOptions): Promise<AIProviderResponse> {
    this.validateMessages(messages);
    this.validateOptions(options);

    try {
      const response = await fetch(`${this.apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: options.model,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens,
          top_p: options.topP,
          frequency_penalty: options.frequencyPenalty,
          presence_penalty: options.presencePenalty,
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return {
        content: data.choices[0]?.message?.content || '',
        model: data.model,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        finishReason: data.choices[0]?.finish_reason,
      };
    } catch (error) {
      throw new Error(`OpenAI chat error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async chatStream(
    messages: Message[],
    options: ChatOptions,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<void> {
    this.validateMessages(messages);
    this.validateOptions(options);

    try {
      onChunk({ type: 'start' });

      const response = await fetch(`${this.apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: options.model,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens,
          top_p: options.topP,
          frequency_penalty: options.frequencyPenalty,
          presence_penalty: options.presencePenalty,
          stream: true,
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
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
            if (data === '[DONE]') {
              onChunk({ type: 'end' });
            } else {
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices[0]?.delta?.content || '';
                if (content) {
                  onChunk({ type: 'text', content });
                }
              } catch {
                // Skip invalid JSON
              }
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
    if (!this.apiKey) return [];
    try {
      const response = await fetch(`${this.apiEndpoint}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) return AVAILABLE_MODELS;

      const data = await response.json();
      return data.data
        .filter((model: any) => model.id.includes('gpt'))
        .map((model: any) => model.id);
    } catch {
      return AVAILABLE_MODELS;
    }
  }

  getAvailableModels(): string[] {
    return AVAILABLE_MODELS;
  }
}
