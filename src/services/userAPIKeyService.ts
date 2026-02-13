/**
 * User API Key Service
 * Manages storage and retrieval of user API keys
 */

import { createClient } from '@/lib/supabase/client';
import type { AIProvider } from './ai/types';

export interface StoredAPIKey {
  id: string;
  provider: AIProvider;
  keyName?: string;
  isActive: boolean;
  lastUsedAt?: string;
  createdAt: string;
}

export class UserAPIKeyService {
  private supabase = createClient();

  /**
   * Save or update user's API key for a provider
   */
  async saveAPIKey(
    userId: string,
    provider: AIProvider,
    apiKey: string,
    keyName?: string
  ): Promise<StoredAPIKey | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_api_keys')
        .upsert({
          user_id: userId,
          provider,
          encrypted_key: this.encryptKey(apiKey),
          key_name: keyName || `${provider}_key`,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      return this.mapToStoredKey(data);
    } catch (error) {
      console.error(`Error saving API key for ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Get user's API key for a provider
   */
  async getAPIKey(userId: string, provider: AIProvider): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_api_keys')
        .select('encrypted_key, is_active')
        .eq('user_id', userId)
        .eq('provider', provider)
        .eq('is_active', true)
        .single();

      if (error || !data) return null;

      // Update last_used_at
      this.updateLastUsed(userId, provider).catch(() => {});

      return this.decryptKey(data.encrypted_key);
    } catch (error) {
      console.error(`Error retrieving API key for ${provider}:`, error);
      return null;
    }
  }

  /**
   * List all API keys for a user
   */
  async listAPIKeys(userId: string): Promise<StoredAPIKey[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_api_keys')
        .select('id, provider, key_name, is_active, last_used_at, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((item) => this.mapToStoredKey(item));
    } catch (error) {
      console.error('Error listing API keys:', error);
      return [];
    }
  }

  /**
   * Delete user's API key
   */
  async deleteAPIKey(userId: string, provider: AIProvider): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_api_keys')
        .delete()
        .eq('user_id', userId)
        .eq('provider', provider);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Error deleting API key for ${provider}:`, error);
      return false;
    }
  }

  /**
   * Check if user has API key for provider
   */
  async hasAPIKey(userId: string, provider: AIProvider): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('user_api_keys')
        .select('id')
        .eq('user_id', userId)
        .eq('provider', provider)
        .eq('is_active', true)
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  }

  /**
   * Get user's available providers
   */
  async getAvailableProviders(userId: string): Promise<AIProvider[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_api_keys')
        .select('provider')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) return [];
      return (data || []).map((item) => item.provider as AIProvider);
    } catch {
      return [];
    }
  }

  /**
   * Simple encryption (base64) - For production use proper encryption
   * This is just masking the key from casual observation in the database
   */
  private encryptKey(key: string): string {
    return Buffer.from(key).toString('base64');
  }

  /**
   * Simple decryption
   */
  private decryptKey(encrypted: string): string {
    return Buffer.from(encrypted, 'base64').toString('utf-8');
  }

  /**
   * Update last used timestamp
   */
  private async updateLastUsed(userId: string, provider: AIProvider): Promise<void> {
    try {
      await this.supabase
        .from('user_api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('provider', provider);
    } catch {
      // Silent fail for last_used_at update
    }
  }

  /**
   * Map database row to StoredAPIKey interface
   */
  private mapToStoredKey(item: any): StoredAPIKey {
    return {
      id: item.id,
      provider: item.provider as AIProvider,
      keyName: item.key_name,
      isActive: item.is_active,
      lastUsedAt: item.last_used_at,
      createdAt: item.created_at,
    };
  }
}
