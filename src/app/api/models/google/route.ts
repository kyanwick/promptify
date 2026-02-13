import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to fetch latest models from Google Gemini
 * Uses Google's models API
 */
export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey) {
      console.warn('[Google] No API key provided');
      return NextResponse.json(
        { models: [] },
        { status: 200 }
      );
    }

    // Use Google's models API to list available models
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    if (!response.ok) {
      console.error('[Google] API error:', response.status, response.statusText);
      throw new Error('Failed to fetch models from Google API');
    }

    const data = await response.json();
    
    // Log all models returned by API
    const allModels = data.models?.map((m: any) => m.name.replace('models/', '')) || [];
    console.log('[Google] Total models from API:', allModels.length);
    
    // Filter for chat/text generation models only
    // Based on Google AI docs: https://ai.google.dev/gemini-api/docs/models
    const models = data.models
      ?.filter((model: any) => {
        const name = model.name.replace('models/', '');
        const methods = model.supportedGenerationMethods || [];
        
        // EXCLUDE: Non-chat models
        if (name.includes('embedding')) return false;        // Embeddings
        if (name.includes('imagen')) return false;           // Image generation
        if (name.includes('nano-banana')) return false;      // Image generation
        if (name.includes('veo')) return false;              // Video generation
        if (name.includes('lyria')) return false;            // Music generation
        if (name.includes('aqa')) return false;              // Attributed QA
        if (name.includes('tts')) return false;              // Text-to-speech
        
        // INCLUDE: Only models that support generateContent (chat/text generation)
        // - gemini-3-pro, gemini-3-flash
        // - gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-lite
        // - gemini-2.0-flash, gemini-2.0-flash-lite (deprecated but still available)
        // - gemini-1.5-pro, gemini-1.5-flash
        return methods.includes('generateContent') && name.startsWith('gemini-');
      })
      .map((model: any) => model.name.replace('models/', ''))
      .sort((a: string, b: string) => {
        // Sort by version number descending
        const getVersion = (model: string): [number, number] => {
          const match = model.match(/gemini-(\d+)(?:\.(\d+))?/);
          if (!match) return [0, 0];
          return [parseInt(match[1]), parseInt(match[2] || '0')];
        };

        const versionA = getVersion(a);
        const versionB = getVersion(b);

        // Sort by major version first
        if (versionA[0] !== versionB[0]) {
          return versionB[0] - versionA[0];
        }
        
        // Then by minor version
        if (versionA[1] !== versionB[1]) {
          return versionB[1] - versionA[1];
        }
        
        // Then prioritize non-lite/experimental versions
        if (a.includes('pro') && !b.includes('pro')) return -1;
        if (b.includes('pro') && !a.includes('pro')) return 1;
        if (a.includes('flash') && !a.includes('lite') && b.includes('lite')) return -1;
        if (b.includes('flash') && !b.includes('lite') && a.includes('lite')) return 1;
        
        return a.localeCompare(b);
      }) || [];

    console.log('[Google] Chat-compatible models:', models.length, 'models');

    return NextResponse.json(
      { models },
      { status: 200, headers: { 'Cache-Control': 'max-age=3600' } }
    );
  } catch (error) {
    console.error('[Google] Error fetching models:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { models: [] },
      { status: 200 }
    );
  }
}
