import { createClient } from '@/lib/supabase/client';

export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  avatar?: string;
  created_at: string;
  updated_at: string;
}

export class UserProfileService {
  async getProfile(userId: string): Promise<UserProfile | null> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      throw error;
    }

    return data as UserProfile;
  }

  async saveProfile(userId: string, name: string, avatar?: string): Promise<UserProfile> {
    const supabase = createClient();

    // Try to update first
    const { data: existing, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existing) {
      // Update existing profile
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          name,
          avatar: avatar || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data as UserProfile;
    } else {
      // Create new profile
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          name,
          avatar: avatar || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as UserProfile;
    }
  }

  async updateProfile(userId: string, updates: Partial<Omit<UserProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<UserProfile> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as UserProfile;
  }

  async deleteProfile(userId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  }
}
