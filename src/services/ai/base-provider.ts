/**
 * Base AI Provider Class
 * Abstract base for all AI providers
 */

import {
  IAIProvider,
  AIProvider,
  Message,
  StreamChunk,
  ChatOptions,
  AIProviderResponse,
  AIProviderConfig,
} from './types';

export abstract class BaseAIProvider implements IAIProvider {
  abstract name: AIProvider;
  protected apiKey: string;
  protected baseURL: string;
  protected timeout: number;

  constructor(config: AIProviderConfig) {
    this.apiKey = config.apiKey || '';
    this.baseURL = config.baseURL || '';
    this.timeout = config.timeout || 30000;
  }

  abstract isAvailable(): Promise<boolean>;
  abstract chat(messages: Message[], options: ChatOptions): Promise<AIProviderResponse>;
  abstract chatStream(
    messages: Message[],
    options: ChatOptions,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<void>;
  abstract listModels(): Promise<string[]>;
  abstract getAvailableModels(): string[];

  protected validateMessages(messages: Message[]): void {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('Messages must be a non-empty array');
    }

    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        throw new Error('Each message must have role and content');
      }
    }
  }

  protected validateOptions(options: ChatOptions): void {
    if (!options.model) {
      throw new Error('Model must be specified');
    }

    if (options.temperature !== undefined) {
      if (options.temperature < 0 || options.temperature > 2) {
        throw new Error('Temperature must be between 0 and 2');
      }
    }

    if (options.maxTokens !== undefined && options.maxTokens < 1) {
      throw new Error('maxTokens must be at least 1');
    }
  }
}
