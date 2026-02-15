import { createClient } from '@/lib/supabase/client';

/**
 * Chat History Cleanup Service
 *
 * Handles automatic cleanup of old chat data to manage database costs:
 * - Deletes sessions older than 30 days
 * - Enforces 50 session limit per user
 * - Runs on client-side when user visits chat
 */

const CLEANUP_INTERVAL_KEY = 'chat_cleanup_last_run';
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class ChatCleanupService {
  private supabase = createClient();

  /**
   * Check if cleanup should run
   * Only runs once per 24 hours to avoid excessive database calls
   */
  shouldRunCleanup(): boolean {
    const lastRun = localStorage.getItem(CLEANUP_INTERVAL_KEY);
    if (!lastRun) {
      return true;
    }

    const lastRunTime = parseInt(lastRun, 10);
    const now = Date.now();

    return now - lastRunTime > CLEANUP_INTERVAL_MS;
  }

  /**
   * Mark cleanup as run
   */
  private markCleanupRun(): void {
    localStorage.setItem(CLEANUP_INTERVAL_KEY, Date.now().toString());
  }

  /**
   * Run cleanup operations
   * Calls database functions to clean up old data
   */
  async runCleanup(): Promise<{
    success: boolean;
    oldSessionsDeleted?: number;
    excessSessionsDeleted?: number;
    error?: string;
  }> {
    try {
      console.log('[ChatCleanup] Starting cleanup...');

      // Call the database cleanup function
      const { data, error } = await this.supabase
        .rpc('cleanup_chat_history');

      if (error) {
        console.error('[ChatCleanup] Cleanup failed:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      // Mark cleanup as complete
      this.markCleanupRun();

      const result = data as { old_sessions_deleted: number; excess_sessions_deleted: number } | null;

      console.log('[ChatCleanup] Cleanup completed:', result);

      return {
        success: true,
        oldSessionsDeleted: result?.old_sessions_deleted || 0,
        excessSessionsDeleted: result?.excess_sessions_deleted || 0,
      };
    } catch (error) {
      console.error('[ChatCleanup] Unexpected error during cleanup:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Auto cleanup - checks if cleanup should run and runs it if needed
   * Call this when user visits chat page or logs in
   */
  async autoCleanup(): Promise<void> {
    if (this.shouldRunCleanup()) {
      await this.runCleanup();
    } else {
      console.log('[ChatCleanup] Skipping cleanup - ran recently');
    }
  }

  /**
   * Force cleanup to run immediately
   * Useful for admin or manual cleanup triggers
   */
  async forceCleanup(): Promise<{
    success: boolean;
    oldSessionsDeleted?: number;
    excessSessionsDeleted?: number;
    error?: string;
  }> {
    return await this.runCleanup();
  }
}

// Export singleton
export const chatCleanupService = new ChatCleanupService();
