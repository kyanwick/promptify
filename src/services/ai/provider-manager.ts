/**
 * AI Provider Manager
 * Handles multiple providers and routing
 */

import {
  IAIProvider,
  AIProvider,
  Message,
  StreamChunk,
  ChatOptions,
  AIProviderResponse,
  AIProviderConfig,
  ProviderRateLimitConfig,
  RateLimitStatus,
} from './types';
import { OpenAIProvider } from './openai-provider';
import { RateLimiter } from './rate-limiter';

export class AIProviderManager {
  private providers: Map<AIProvider, IAIProvider> = new Map();
  private defaultProvider: AIProvider = 'openai';
  private rateLimiter: RateLimiter;

  constructor(rateLimitConfig?: ProviderRateLimitConfig) {
    this.rateLimiter = new RateLimiter(rateLimitConfig);
  }

  registerProvider(provider: IAIProvider): void {
    this.providers.set(provider.name, provider);
  }

  setDefaultProvider(provider: AIProvider): void {
    if (!this.providers.has(provider)) {
      throw new Error(`Provider ${provider} not registered`);
    }
    this.defaultProvider = provider;
  }

  getProvider(name?: AIProvider): IAIProvider {
    const providerName = name || this.defaultProvider;
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not registered`);
    }
    return provider;
  }

  async getAvailableProviders(): Promise<AIProvider[]> {
    const available: AIProvider[] = [];
    for (const [name, provider] of this.providers) {
      if (await provider.isAvailable()) {
        available.push(name);
      }
    }
    return available;
  }

  checkRateLimit(userId: string): RateLimitStatus {
    return this.rateLimiter.checkLimit(userId);
  }

  recordRequest(userId: string, tokenCount: number = 0): void {
    this.rateLimiter.recordRequest(userId, tokenCount);
  }

  getRemainingUsage(userId: string) {
    return this.rateLimiter.getRemainingUsage(userId);
  }

  async chat(
    userId: string,
    messages: Message[],
    options: ChatOptions,
    provider?: AIProvider
  ): Promise<AIProviderResponse> {
    // Check rate limit
    const limitStatus = this.checkRateLimit(userId);
    if (limitStatus.isLimited) {
      throw new Error(
        `Rate limit exceeded. Try again in ${Math.ceil((limitStatus.nextAvailableIn || 0) / 1000)} seconds`
      );
    }

    // Get provider
    const aiProvider = this.getProvider(provider);

    // Make request
    const response = await aiProvider.chat(messages, options);

    // Record usage
    this.recordRequest(
      userId,
      response.usage?.totalTokens || 0
    );

    return response;
  }

  async chatStream(
    userId: string,
    messages: Message[],
    options: ChatOptions,
    onChunk: (chunk: StreamChunk) => void,
    provider?: AIProvider
  ): Promise<void> {
    // Check rate limit
    const limitStatus = this.checkRateLimit(userId);
    if (limitStatus.isLimited) {
      onChunk({
        type: 'error',
        error: `Rate limit exceeded. Try again in ${Math.ceil((limitStatus.nextAvailableIn || 0) / 1000)} seconds`,
      });
      return;
    }

    // Get provider
    const aiProvider = this.getProvider(provider);

    // Wrapper to track tokens
    let totalTokens = 0;
    const wrappedOnChunk = (chunk: StreamChunk) => {
      if (chunk.usage?.totalTokens) {
        totalTokens = chunk.usage.totalTokens;
      }
      onChunk(chunk);
    };

    try {
      await aiProvider.chatStream(messages, options, wrappedOnChunk);
      this.recordRequest(userId, totalTokens);
    } catch (error) {
      throw error;
    }
  }

  destroy(): void {
    this.rateLimiter.destroy();
  }
}

// Initialize and export singleton
let managerInstance: AIProviderManager | null = null;

export function initializeAIProviders(rateLimitConfig?: ProviderRateLimitConfig): AIProviderManager {
  if (managerInstance) {
    return managerInstance;
  }

  managerInstance = new AIProviderManager(rateLimitConfig);

  // Register available providers
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (openaiApiKey) {
    const openaiProvider = new OpenAIProvider({
      apiKey: openaiApiKey,
      baseURL: process.env.OPENAI_API_BASE,
    });
    managerInstance.registerProvider(openaiProvider);
  }

  return managerInstance;
}

export function getAIProviderManager(): AIProviderManager {
  if (!managerInstance) {
    managerInstance = initializeAIProviders();
  }
  return managerInstance;
}
