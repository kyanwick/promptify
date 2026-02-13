/**
 * Google Gemini Provider Implementation
 * Supports Gemini Pro and other Google AI models
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
  'gemini-2.0-flash-exp',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
];

export class GoogleProvider extends BaseAIProvider {
  name: AIProvider = 'google';
  private apiEndpoint: string;

  constructor(config: AIProviderConfig) {
    super(config);
    this.apiEndpoint = config.baseURL || 'https://generativelanguage.googleapis.com/v1beta';
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const response = await fetch(`${this.apiEndpoint}/models?key=${this.apiKey}`, {
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

    const { systemInstruction, contents } = this.convertMessages(messages);

    try {
      const requestBody: any = {
        contents,
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens,
          topP: options.topP,
        },
      };

      if (systemInstruction) {
        requestBody.systemInstruction = systemInstruction;
      }

      const response = await fetch(
        `${this.apiEndpoint}/models/${options.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(this.timeout),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Google API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return {
        content,
        model: options.model,
        usage: {
          promptTokens: data.usageMetadata?.promptTokenCount || 0,
          completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata?.totalTokenCount || 0,
        },
        finishReason: data.candidates?.[0]?.finishReason,
      };
    } catch (error) {
      throw new Error(`Google chat error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async chatStream(
    messages: Message[],
    options: ChatOptions,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<void> {
    this.validateMessages(messages);
    this.validateOptions(options);

    const { systemInstruction, contents } = this.convertMessages(messages);

    try {
      onChunk({ type: 'start' });

      const requestBody: any = {
        contents,
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens,
          topP: options.topP,
        },
      };

      if (systemInstruction) {
        requestBody.systemInstruction = systemInstruction;
      }

      const response = await fetch(
        `${this.apiEndpoint}/models/${options.model}:streamGenerateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(this.timeout),
        }
      );

      if (!response.ok) {
        throw new Error(`Google API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          onChunk({ type: 'end' });
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        
        // Google returns newline-delimited JSON objects
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line);
              const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (content) {
                onChunk({ type: 'text', content });
              }
              
              if (parsed.candidates?.[0]?.finishReason) {
                // Don't send end here, wait for stream to finish
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
    if (!this.apiKey) return AVAILABLE_MODELS;
    try {
      const response = await fetch(`${this.apiEndpoint}/models?key=${this.apiKey}`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) return AVAILABLE_MODELS;

      const data = await response.json();
      return data.models
        ?.filter((model: any) => model.name.includes('gemini'))
        .map((model: any) => model.name.replace('models/', '')) || AVAILABLE_MODELS;
    } catch {
      return AVAILABLE_MODELS;
    }
  }

  getAvailableModels(): string[] {
    return AVAILABLE_MODELS;
  }

  private convertMessages(messages: Message[]): {
    systemInstruction?: { parts: Array<{ text: string }> };
    contents: Array<{ role: string; parts: Array<{ text: string }> }>;
  } {
    let systemInstruction: { parts: Array<{ text: string }> } | undefined;
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        // Google uses systemInstruction for system messages
        systemInstruction = {
          parts: [{ text: msg.content }],
        };
      } else {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user', // Google uses 'model' instead of 'assistant'
          parts: [{ text: msg.content }],
        });
      }
    }

    return { systemInstruction, contents };
  }
}
