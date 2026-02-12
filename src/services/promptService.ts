import { createClient } from '@/lib/supabase/client';
import type { Node, Connection } from '@/components/prompts/types';

export interface SavedPrompt {
  id: string;
  user_id: string;
  title: string;
  nodes: Node[];
  connections: Connection[];
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
}

export interface CreatePromptData {
  title: string;
  nodes: Node[];
  connections: Connection[];
  status: 'draft' | 'published';
}

export interface UpdatePromptData {
  title?: string;
  nodes?: Node[];
  connections?: Connection[];
  status?: 'draft' | 'published';
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
}

// Export a singleton instance
export const promptService = new PromptService();
