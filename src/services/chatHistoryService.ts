import { createClient } from '@/lib/supabase/client';

// =====================================================
// CONSTANTS
// =====================================================
export const MAX_SESSIONS_PER_USER = 50;
export const MAX_MESSAGES_PER_SESSION = 200;
export const MAX_MESSAGE_LENGTH = 10000;
export const RETENTION_DAYS = 30;

// =====================================================
// INTERFACES
// =====================================================
export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  prompt_id: string | null;
  provider: string;
  model: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface CreateSessionData {
  title: string;
  prompt_id?: string | null;
  provider: string;
  model: string;
}

export interface CreateMessageData {
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface SessionWithMessages {
  session: ChatSession;
  messages: ChatMessage[];
}

// =====================================================
// SERVICE CLASS
// =====================================================
export class ChatHistoryService {
  private supabase = createClient();

  // ===================================================
  // SESSION OPERATIONS
  // ===================================================

  /**
   * Create a new chat session
   * Automatically enforces session limit before creation
   */
  async createSession(data: CreateSessionData): Promise<ChatSession | null> {
    try {
      // Enforce session limit before creating
      await this.enforceSessionLimit();

      const { data: session, error } = await this.supabase
        .from('chat_sessions')
        .insert({
          title: data.title.substring(0, 100), // Enforce max title length
          prompt_id: data.prompt_id || null,
          provider: data.provider,
          model: data.model,
          message_count: 0,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating session:', error);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  }

  /**
   * Get a single session by ID
   */
  async getSession(id: string): Promise<ChatSession | null> {
    try {
      const { data: session, error } = await this.supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching session:', error);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error fetching session:', error);
      return null;
    }
  }

  /**
   * Get all sessions for the current user
   * Ordered by most recently updated
   */
  async getAllSessions(limit: number = 50): Promise<ChatSession[]> {
    try {
      const { data: sessions, error } = await this.supabase
        .from('chat_sessions')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching sessions:', error);
        return [];
      }

      return sessions || [];
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }
  }

  /**
   * Update session title
   */
  async updateSessionTitle(id: string, title: string): Promise<ChatSession | null> {
    try {
      const { data: session, error } = await this.supabase
        .from('chat_sessions')
        .update({
          title: title.substring(0, 100), // Enforce max title length
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating session title:', error);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error updating session title:', error);
      return null;
    }
  }

  /**
   * Delete a session (cascade deletes all messages)
   */
  async deleteSession(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('chat_sessions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting session:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  }

  // ===================================================
  // MESSAGE OPERATIONS
  // ===================================================

  /**
   * Add a message to a session
   * Automatically checks message count limit and truncates content if needed
   */
  async addMessage(data: CreateMessageData): Promise<ChatMessage | null> {
    try {
      // Check if session exists and get message count
      const session = await this.getSession(data.session_id);
      if (!session) {
        console.error('Session not found:', data.session_id);
        return null;
      }

      // Check message count limit
      if (session.message_count >= MAX_MESSAGES_PER_SESSION) {
        console.error('Message limit reached for session:', data.session_id);
        return null;
      }

      // Truncate content if needed
      let content = data.content;
      if (content.length > MAX_MESSAGE_LENGTH) {
        content = content.substring(0, MAX_MESSAGE_LENGTH);
        console.warn('Message truncated from', data.content.length, 'to', MAX_MESSAGE_LENGTH, 'characters');
      }

      const { data: message, error } = await this.supabase
        .from('chat_messages')
        .insert({
          session_id: data.session_id,
          role: data.role,
          content: content,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding message:', error);
        return null;
      }

      return message;
    } catch (error) {
      console.error('Error adding message:', error);
      return null;
    }
  }

  /**
   * Get all messages for a session
   * Ordered by creation time (oldest first)
   */
  async getSessionMessages(sessionId: string, limit: number = 200): Promise<ChatMessage[]> {
    try {
      const { data: messages, error } = await this.supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error fetching messages:', error);
        return [];
      }

      return messages || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('chat_messages')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting message:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  }

  // ===================================================
  // COMBINED OPERATIONS
  // ===================================================

  /**
   * Get a session with all its messages
   */
  async getSessionWithMessages(sessionId: string): Promise<SessionWithMessages | null> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return null;
      }

      const messages = await this.getSessionMessages(sessionId);

      return {
        session,
        messages,
      };
    } catch (error) {
      console.error('Error fetching session with messages:', error);
      return null;
    }
  }

  // ===================================================
  // LIMIT ENFORCEMENT
  // ===================================================

  /**
   * Enforce session limit (max 50 sessions per user)
   * Deletes oldest sessions if user has more than allowed
   * This is called automatically before creating a new session
   */
  private async enforceSessionLimit(): Promise<void> {
    try {
      // Get current session count
      const sessions = await this.getAllSessions(MAX_SESSIONS_PER_USER + 1);

      // If we're at or over the limit, delete the oldest ones
      if (sessions.length >= MAX_SESSIONS_PER_USER) {
        const sessionsToDelete = sessions.slice(MAX_SESSIONS_PER_USER - 1); // Keep 49, delete the rest

        for (const session of sessionsToDelete) {
          await this.deleteSession(session.id);
        }

        console.log(`Deleted ${sessionsToDelete.length} old session(s) to enforce limit`);
      }
    } catch (error) {
      console.error('Error enforcing session limit:', error);
      // Don't throw - allow session creation to continue
    }
  }

  /**
   * Get current session count for the user
   */
  async getSessionCount(): Promise<number> {
    try {
      const sessions = await this.getAllSessions();
      return sessions.length;
    } catch (error) {
      console.error('Error getting session count:', error);
      return 0;
    }
  }

  /**
   * Check if user can create more sessions
   */
  async canCreateSession(): Promise<boolean> {
    try {
      const count = await this.getSessionCount();
      return count < MAX_SESSIONS_PER_USER;
    } catch (error) {
      console.error('Error checking session limit:', error);
      return false;
    }
  }

  /**
   * Check if session can accept more messages
   */
  async canAddMessage(sessionId: string): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return false;
      }
      return session.message_count < MAX_MESSAGES_PER_SESSION;
    } catch (error) {
      console.error('Error checking message limit:', error);
      return false;
    }
  }

  // ===================================================
  // UTILITY FUNCTIONS
  // ===================================================

  /**
   * Generate a session title from the first user message
   */
  generateTitle(firstMessage: string): string {
    // Special handling for prompt messages
    if (firstMessage.startsWith('Following prompt:')) {
      // Extract just the prompt name between quotes
      const match = firstMessage.match(/Following prompt: "([^"]+)"/);
      if (match && match[1]) {
        return match[1];
      }
    }

    // For regular messages, use first line or first sentence
    let title = firstMessage.split('\n')[0]; // Get first line

    // If first line is too long, try to get first sentence
    if (title.length > 60) {
      const sentenceMatch = firstMessage.match(/^[^.!?]+[.!?]/);
      if (sentenceMatch) {
        title = sentenceMatch[0];
      }
    }

    // Truncate if still too long
    if (title.length > 50) {
      return title.substring(0, 47) + '...';
    }

    return title || 'New Chat';
  }

  /**
   * Truncate message content to max length
   */
  truncateContent(content: string): { content: string; wasTruncated: boolean } {
    if (content.length > MAX_MESSAGE_LENGTH) {
      return {
        content: content.substring(0, MAX_MESSAGE_LENGTH),
        wasTruncated: true,
      };
    }
    return {
      content,
      wasTruncated: false,
    };
  }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================
export const chatHistoryService = new ChatHistoryService();
