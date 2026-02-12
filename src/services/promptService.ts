import { createClient } from '@/lib/supabase/client';
import type { Node, Connection } from '@/components/prompts/types';

export interface SavedPrompt {
  id: string;
  user_id: string;
  title: string;
  emoji: string;
  nodes: Node[];
  connections: Connection[];
  status: 'draft' | 'published';
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePromptData {
  title: string;
  emoji?: string;
  nodes: Node[];
  connections: Connection[];
  status: 'draft' | 'published';
  is_public?: boolean;
}

export interface UpdatePromptData {
  title?: string;
  emoji?: string;
  nodes?: Node[];
  connections?: Connection[];
  status?: 'draft' | 'published';
  is_public?: boolean;
}

export class PromptService {
  private supabase = createClient();

  /**
   * Save a new prompt as draft
   */
  async saveDraft(data: CreatePromptData): Promise<SavedPrompt | null> {
    try {
      const { data: prompt, error } = await this.supabase
        .from('prompts')
        .insert({
          title: data.title,
          nodes: data.nodes,
          connections: data.connections,
          status: 'draft',
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving draft:', error);
        return null;
      }

      return prompt;
    } catch (error) {
      console.error('Error saving draft:', error);
      return null;
    }
  }

  /**
   * Update an existing prompt
   */
  async updatePrompt(id: string, data: UpdatePromptData): Promise<SavedPrompt | null> {
    try {
      const { data: prompt, error } = await this.supabase
        .from('prompts')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating prompt:', error);
        return null;
      }

      return prompt;
    } catch (error) {
      console.error('Error updating prompt:', error);
      return null;
    }
  }

  /**
   * Publish a prompt (save and set status to published)
   */
  async publish(id: string, data: UpdatePromptData): Promise<SavedPrompt | null> {
    try {
      const { data: prompt, error } = await this.supabase
        .from('prompts')
        .update({
          ...data,
          status: 'published',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error publishing prompt:', error);
        return null;
      }

      return prompt;
    } catch (error) {
      console.error('Error publishing prompt:', error);
      return null;
    }
  }

  /**
   * Get a single prompt by ID
   */
  async getPrompt(id: string): Promise<SavedPrompt | null> {
    try {
      const { data: prompt, error } = await this.supabase
        .from('prompts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching prompt:', error);
        return null;
      }

      return prompt;
    } catch (error) {
      console.error('Error fetching prompt:', error);
      return null;
    }
  }

  /**
   * Get all prompts for the current user
   */
  async getAllPrompts(status?: 'draft' | 'published'): Promise<SavedPrompt[]> {
    try {
      let query = this.supabase
        .from('prompts')
        .select('*')
        .order('updated_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data: prompts, error } = await query;

      if (error) {
        console.error('Error fetching prompts:', error);
        return [];
      }

      return prompts || [];
    } catch (error) {
      console.error('Error fetching prompts:', error);
      return [];
    }
  }

  /**
   * Delete a prompt
   */
  async deletePrompt(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('prompts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting prompt:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting prompt:', error);
      return false;
    }
  }

  /**
   * Duplicate a prompt (creates a copy with "Copy of" prefix)
   */
  async duplicatePrompt(id: string): Promise<SavedPrompt | null> {
    try {
      // First get the original prompt
      const original = await this.getPrompt(id);
      if (!original) {
        console.error('Prompt not found');
        return null;
      }

      // Create a copy with modified title
      const { data: duplicate, error } = await this.supabase
        .from('prompts')
        .insert({
          title: `Copy of ${original.title}`,
          emoji: original.emoji,
          nodes: original.nodes,
          connections: original.connections,
          status: 'draft', // Always create duplicates as drafts
          is_public: false, // Never make duplicates public automatically
        })
        .select()
        .single();

      if (error) {
        console.error('Error duplicating prompt:', error);
        return null;
      }

      return duplicate;
    } catch (error) {
      console.error('Error duplicating prompt:', error);
      return null;
    }
  }

  /**
   * Toggle the public status of a prompt
   */
  async togglePublic(id: string, isPublic: boolean): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('prompts')
        .update({ is_public: isPublic })
        .eq('id', id);

      if (error) {
        console.error('Error toggling public status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error toggling public status:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const promptService = new PromptService();
