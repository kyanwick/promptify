/**
 * Supabase Edge Function: Cleanup Chat History
 *
 * Automatically cleans up old chat data to manage database costs:
 * - Deletes sessions older than 30 days
 * - Enforces 50 session limit per user
 *
 * Schedule this function to run daily via Supabase cron:
 * https://supabase.com/docs/guides/functions/schedule-functions
 *
 * Example cron schedule (runs daily at 2 AM):
 * ```sql
 * select cron.schedule(
 *   'cleanup-chat-history',
 *   '0 2 * * *',
 *   $$
 *   select net.http_post(
 *     url:='https://your-project.supabase.co/functions/v1/cleanup-chat-history',
 *     headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
 *   ) as request_id;
 *   $$
 * );
 * ```
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface CleanupResult {
  old_sessions_deleted: number;
  excess_sessions_deleted: number;
}

Deno.serve(async (req) => {
  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[CleanupFunction] Starting cleanup...');

    // Call the database cleanup function
    const { data, error } = await supabase
      .rpc('cleanup_chat_history');

    if (error) {
      console.error('[CleanupFunction] Cleanup failed:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const result = data as CleanupResult;

    console.log('[CleanupFunction] Cleanup completed:', result);

    return new Response(
      JSON.stringify({
        success: true,
        oldSessionsDeleted: result.old_sessions_deleted,
        excessSessionsDeleted: result.excess_sessions_deleted,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[CleanupFunction] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
