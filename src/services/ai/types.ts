/**
 * AI Provider Types and Interfaces
 */

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'local';
export type Model = string;

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamChunk {
  type: 'start' | 'text' | 'end' | 'error';
  content?: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ChatOptions {
  model: Model;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface AIProviderConfig {
  apiKey?: string;
  baseURL?: string;
  timeout?: number;
}

export interface AIProviderResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

export interface IAIProvider {
  name: AIProvider;
  isAvailable(): Promise<boolean>;
  chat(messages: Message[], options: ChatOptions): Promise<AIProviderResponse>;
  chatStream(
    messages: Message[],
    options: ChatOptions,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<void>;
  listModels(): Promise<string[]>;
  getAvailableModels(): string[];
}

export interface ProviderRateLimitConfig {
  requestsPerMinute?: number;
  requestsPerHour?: number;
  requestsPerDay?: number;
  tokensPerMinute?: number;
  tokensPerHour?: number;
  tokensPerDay?: number;
}

export interface RateLimitStatus {
  isLimited: boolean;
  nextAvailableIn?: number; // milliseconds
  remaining?: {
    requestsThisMinute?: number;
    requestsThisHour?: number;
    requestsThisDay?: number;
    tokensThisMinute?: number;
    tokensThisHour?: number;
    tokensThisDay?: number;
  };
}
