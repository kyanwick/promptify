import type { AIProvider } from './ai/types';
import { UserAPIKeyService } from './userAPIKeyService';

/**
 * Service to fetch the latest available models from each AI provider
 * Calls server-side endpoints that handle API auth and caching
 */
class ModelService {
  private cache: Map<string, { models: string[]; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour
  private apiKeyService = new UserAPIKeyService();

  async getLatestModels(provider: AIProvider, userId?: string): Promise<string[]> {
    // Check cache first
    const cacheKey = `${provider}_${userId || 'anonymous'}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.models;
    }

    let models: string[] = [];

    try {
      // Get the user's API key for this provider
      let apiKey: string | null = null;
      if (userId) {
        try {
          apiKey = await this.apiKeyService.getAPIKey(userId, provider);
        } catch (error) {
          console.warn(`No API key found for ${provider}`);
        }
      }

      // Call server-side endpoint with POST
      const endpoint = `/api/models/${provider}`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey || '' }),
      });
      
      if (response.ok) {
        const data = await response.json();
        models = data.models || [];
      } else {
        console.warn(`Failed to fetch ${provider} models: ${response.status}`);
      }
    } catch (error) {
      console.warn(`Error fetching ${provider} models:`, error);
    }

    // Cache the result (even if empty, to avoid repeated failed requests)
    this.cache.set(cacheKey, {
      models,
      timestamp: Date.now(),
    });

    return models;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const modelService = new ModelService();
