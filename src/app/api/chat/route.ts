/**
 * Chat API Route
 * Handles AI chat requests with rate limiting and streaming
 */

import { NextRequest, NextResponse } from 'next/server';
import { OpenAIProvider } from '@/services/ai/openai-provider';
import { RateLimiter } from '@/services/ai/rate-limiter';
import { UserAPIKeyService } from '@/services/userAPIKeyService';
import type { Message } from '@/services/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, options, stream = false, userId, provider = 'openai' } = body;

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

    // Get user's API key
    const apiKeyService = new UserAPIKeyService();
    const userAPIKey = await apiKeyService.getAPIKey(userId, provider);

    if (!userAPIKey) {
      return NextResponse.json(
        {
          error: `No ${provider} API key configured. Please add your API key in settings.`,
          code: 'NO_API_KEY',
        },
        { status: 403 }
      );
    }

    // Initialize provider with user's API key
    const aiProvider = new OpenAIProvider({
      apiKey: userAPIKey,
    });

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
      return handleStream(messages, options, userId, aiProvider, rateLimiter);
    }

    // Handle regular request
    const response = await aiProvider.chat(messages, options);
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
        let totalTokens = 0;

        await aiProvider.chatStream(userId, messages, options, (chunk: any) => {
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
