/**
 * Chat API Route
 * Handles AI chat requests with rate limiting and streaming
 */

import { NextRequest, NextResponse } from 'next/server';
import { OpenAIProvider } from '@/services/ai/openai-provider';
import { AnthropicProvider } from '@/services/ai/anthropic-provider';
import { GoogleProvider } from '@/services/ai/google-provider';
import { RateLimiter } from '@/services/ai/rate-limiter';
import { UserAPIKeyService } from '@/services/userAPIKeyService';
import type { Message, AIProvider as AIProviderType } from '@/services/ai';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, options, stream = false, userId, provider = 'openai' } = body;

    console.log('[API /chat] Request received:', { userId, provider, model: options?.model, messageCount: messages?.length });

    // Validate input
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid messages format' },
        { status: 400 }
      );
    }

    if (!options || !options.model) {
      return NextResponse.json(
        { error: 'Model must be specified' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Get user's API key from database. Use service role key on server to bypass RLS
    let userAPIKey: string | null = null;

    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
        const svc = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const { data, error } = await svc
          .from('user_api_keys')
          .select('encrypted_key, is_active')
          .eq('user_id', userId)
          .eq('provider', provider)
          .eq('is_active', true)
          .single();

        if (!error && data && data.encrypted_key) {
          try {
            userAPIKey = Buffer.from(data.encrypted_key, 'base64').toString('utf-8');
            console.log('[API /chat] Retrieved API key from DB via service role');
          } catch (e) {
            console.error('[API /chat] Failed to decrypt API key from DB:', e);
          }
        } else {
          console.log('[API /chat] Service role DB lookup error or no data:', error);
        }
      }
    } catch (err) {
      console.error('[API /chat] Error accessing Supabase with service role key:', err);
    }

    // Fallback to user API key service (may require session/RLS)
    if (!userAPIKey) {
      const apiKeyService = new UserAPIKeyService();
      const dbKey = await apiKeyService.getAPIKey(userId, provider);
      if (dbKey) {
        userAPIKey = dbKey;
        console.log('[API /chat] Retrieved API key via UserAPIKeyService fallback');
      }
    }

    console.log('[API /chat] Final API key presence:', userAPIKey ? 'Yes' : 'No');

    if (!userAPIKey) {
      return NextResponse.json(
        {
          error: `No ${provider} API key configured. Please add your API key in settings.`,
          code: 'NO_API_KEY',
        },
        { status: 403 }
      );
    }

    // Normalize messages to ensure each has role and string content
    const normalizeMessages = (msgs: any[]): Message[] => {
      const allowed = new Set(['system', 'user', 'assistant']);
      if (!Array.isArray(msgs)) return [];
      return msgs
        .map((m) => {
          const role = m?.role && typeof m.role === 'string' && allowed.has(m.role) ? m.role : 'user';
          let content = '';

          if (typeof m.content === 'string') {
            content = m.content;
          } else if (typeof m.message === 'string') {
            content = m.message;
          } else if (m?.content && typeof m.content === 'object') {
            // Common shapes: { parts: [...] } or nested content objects
            if (Array.isArray(m.content.parts)) {
              content = m.content.parts.map((p: any) => (typeof p === 'string' ? p : JSON.stringify(p))).join('');
            } else if (Array.isArray(m.content)) {
              content = m.content.map((p: any) => (typeof p === 'string' ? p : JSON.stringify(p))).join('\n');
            } else if (typeof m.content.text === 'string') {
              content = m.content.text;
            } else {
              content = JSON.stringify(m.content);
            }
          } else if (typeof m.text === 'string') {
            content = m.text;
          }

          return { role, content: (content || '').trim() } as Message;
        })
        .filter((mm) => mm.content && mm.content.length > 0);
    };

    const normalizedMessages = normalizeMessages(messages);

    if (!normalizedMessages || normalizedMessages.length === 0) {
      return NextResponse.json({ error: 'No valid messages to send' }, { status: 400 });
    }

    // Log options (safe) and normalized messages for debugging
    try {
      console.log('[API /chat] Options:', {
        model: options?.model,
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
        topP: options?.topP,
      });
      console.log('[API /chat] Normalized messages count:', normalizedMessages.length);
    } catch (e) {
      console.warn('[API /chat] Failed to log options', e);
    }

    // Initialize provider with user's API key
    console.log('[API /chat] Initializing provider:', provider);
    let aiProvider;
    switch (provider) {
      case 'openai':
        aiProvider = new OpenAIProvider({
          apiKey: userAPIKey,
        });
        break;
      case 'anthropic':
        aiProvider = new AnthropicProvider({
          apiKey: userAPIKey,
        });
        break;
      case 'google':
        aiProvider = new GoogleProvider({
          apiKey: userAPIKey,
        });
        break;
      default:
        return NextResponse.json(
          { error: `Unsupported provider: ${provider}` },
          { status: 400 }
        );
    }
    console.log('[API /chat] Provider initialized successfully');

    // Initialize rate limiter
    const rateLimiter = new RateLimiter();

    // Check rate limit
    const rateLimitStatus = rateLimiter.checkLimit(userId);
    if (rateLimitStatus.isLimited) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((rateLimitStatus.nextAvailableIn || 0) / 1000),
        },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateLimitStatus.nextAvailableIn || 0) / 1000)) } }
      );
    }

    // Handle streaming
    if (stream) {
      console.log('[API /chat] Starting stream for provider:', provider);
      return handleStream(normalizedMessages, options, userId, aiProvider, rateLimiter);
    }

    // Handle regular request
    const response = await aiProvider.chat(normalizedMessages, options);
    rateLimiter.recordRequest(userId, response.usage?.totalTokens || 0);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

function handleStream(
  messages: Message[],
  options: any,
  userId: string,
  aiProvider: any,
  rateLimiter: any
) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log('[API /chat] Stream started');
        let totalTokens = 0;

        await aiProvider.chatStream(messages, options, (chunk: any) => {
          console.log('[API /chat] Stream chunk:', chunk.type);
          if (chunk.usage?.totalTokens) {
            totalTokens = chunk.usage.totalTokens;
          }
          const data = `data: ${JSON.stringify(chunk)}\n\n`;
          controller.enqueue(encoder.encode(data));
        });

        rateLimiter.recordRequest(userId, totalTokens);
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        const errorData = {
          type: 'error',
          error: error instanceof Error ? error.message : 'Streaming error',
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
