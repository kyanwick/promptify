import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Delete all user's API keys
    const { error: keysError } = await supabase
      .from('user_api_keys')
      .delete()
      .eq('user_id', userId);

    if (keysError) {
      console.error('Error deleting API keys:', keysError);
      throw keysError;
    }

    // Delete all user's prompts
    const { error: promptsError } = await supabase
      .from('prompts')
      .delete()
      .eq('user_id', userId);

    if (promptsError) {
      console.error('Error deleting prompts:', promptsError);
      throw promptsError;
    }

    // TODO: Add more data deletion as the schema expands
    // - chat history
    // - shared prompts
    // - user profile data
    // etc.

    return NextResponse.json(
      { success: true, message: 'Account deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
