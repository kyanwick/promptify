/**
 * Local API Key Service
 * Stores API keys in browser localStorage for quick testing/development
 * Use this if you don't have Supabase configured yet
 */

import type { AIProvider } from './ai/types';

export interface LocalStoredAPIKey {
  provider: AIProvider;
  apiKey: string;
  keyName?: string;
  createdAt: string;
}

export class LocalAPIKeyService {
  private storageKey = 'promptify_api_keys';

  /**
   * Save or update API key for a provider
   */
  saveAPIKey(provider: AIProvider, apiKey: string, keyName?: string): void {
    const keys = this.getAllKeys();
    const existingIndex = keys.findIndex(k => k.provider === provider);
    
    const newKey: LocalStoredAPIKey = {
      provider,
      apiKey,
      keyName: keyName || `${provider}_key`,
      createdAt: existingIndex >= 0 ? keys[existingIndex].createdAt : new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      keys[existingIndex] = newKey;
    } else {
      keys.push(newKey);
    }

    localStorage.setItem(this.storageKey, JSON.stringify(keys));
  }

  /**
   * Get API key for a provider
   */
  getAPIKey(provider: AIProvider): string | null {
    const keys = this.getAllKeys();
    const found = keys.find(k => k.provider === provider);
    return found?.apiKey || null;
  }

  /**
   * Get all stored API keys
   */
  getAllKeys(): LocalStoredAPIKey[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Get list of providers that have keys configured
   */
  getAvailableProviders(): AIProvider[] {
    const keys = this.getAllKeys();
    return keys.map(k => k.provider);
  }

  /**
   * Delete API key for a provider
   */
  deleteAPIKey(provider: AIProvider): void {
    const keys = this.getAllKeys();
    const filtered = keys.filter(k => k.provider !== provider);
    localStorage.setItem(this.storageKey, JSON.stringify(filtered));
  }

  /**
   * Check if provider has API key configured
   */
  hasAPIKey(provider: AIProvider): boolean {
    return this.getAPIKey(provider) !== null;
  }
}
