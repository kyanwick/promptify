import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to fetch latest models from OpenAI
 * Uses OpenAI's models list endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey) {
      console.warn('[OpenAI] No API key provided');
      return NextResponse.json(
        { models: [] },
        { status: 200 }
      );
    }

    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      console.error('[OpenAI] API error:', response.status, response.statusText);
      throw new Error(`OpenAI API returned ${response.status}`);
    }

    const data = await response.json();
    
    // Log all models returned by API
    const allModels = data.data?.map((m: any) => m.id) || [];
    console.log('[OpenAI] Total models from API:', allModels.length);
    
    // Filter for chat completion models only (work with /v1/chat/completions)
    // Based on OpenAI docs: https://developers.openai.com/api/docs/models
    const models = data.data
      ?.filter((model: any) => {
        const id = model.id;
        
        // EXCLUDE: Non-chat models
        if (id.includes('-codex')) return false;           // Codex models (coding-specific)
        if (id.includes('-chat-latest')) return false;     // ChatGPT models (not for API)
        if (id.includes('realtime')) return false;         // Realtime API models
        if (id.includes('tts')) return false;              // Text-to-speech
        if (id.includes('transcribe')) return false;       // Speech-to-text
        if (id.includes('whisper')) return false;          // Speech recognition
        if (id.includes('embedding')) return false;        // Embeddings
        if (id.includes('moderation')) return false;       // Content moderation
        if (id.includes('dall-e')) return false;           // Image generation
        if (id.includes('gpt-image')) return false;        // Image generation
        if (id.startsWith('sora')) return false;           // Video generation
        if (id.includes('deep-research')) return false;    // Deep research models
        if (id.includes('-audio')) return false;           // Audio models
        if (id.includes('babbage') || id.includes('davinci') || id.includes('curie') || id.includes('ada')) return false; // Legacy
        if (id.startsWith('ft:')) return false;            // Fine-tuned models
        if (id.includes('-instruct')) return false;        // Legacy instruction models
        if (id.includes('-search-preview')) return false;  // Search preview models
        
        // INCLUDE: Chat completion models
        // - gpt-5.x series (gpt-5.2, gpt-5.1, gpt-5)
        // - gpt-5-mini, gpt-5-nano, gpt-5.2-pro
        // - gpt-4.x series (gpt-4.1, gpt-4)
        // - gpt-4o series (gpt-4o, gpt-4o-mini)
        // - gpt-4-turbo
        // - gpt-3.5-turbo
        // - o3, o3-mini, o4-mini (reasoning models that work with chat API)
        return (
          id.match(/^gpt-(5\.2|5\.1|5)(-pro|-mini|-nano)?$/) ||  // GPT-5 series
          id.match(/^gpt-4\.1(-mini)?$/) ||                       // GPT-4.1
          id.match(/^gpt-4o(-mini)?$/) ||                         // GPT-4o series
          id === 'gpt-4-turbo' ||
          id === 'gpt-4' ||
          id.startsWith('gpt-3.5-turbo') ||
          id.match(/^o[34](-mini|-pro)?$/)                        // o3, o4 reasoning models
        );
      })
      .map((model: any) => model.id)
      .sort((a: string, b: string) => {
        // Sort by version number descending
        const getVersion = (model: string): [number, number] => {
          const match = model.match(/gpt-(\d+)(?:\.(\d+))?|o(\d+)/);
          if (!match) return [0, 0];
          if (match[3]) return [parseInt(match[3]), 0]; // o3, o4
          return [parseInt(match[1]), parseInt(match[2] || '0')];
        };

        const versionA = getVersion(a);
        const versionB = getVersion(b);

        if (versionA[0] !== versionB[0]) {
          return versionB[0] - versionA[0];
        }
        return versionB[1] - versionA[1];
      }) || [];

    console.log('[OpenAI] Chat-compatible models:', models.length, 'models');

    return NextResponse.json(
      { models },
      { status: 200, headers: { 'Cache-Control': 'max-age=3600' } }
    );
  } catch (error) {
    console.error('[OpenAI] Error fetching models:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { models: [] },
      { status: 200 }
    );
  }
}
