import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to fetch latest models from Anthropic
 * Anthropic publishes their models, we can fetch from their API
 */
export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json(
        { models: [] },
        { status: 200 }
      );
    }

    // Fetch models from Anthropic's API
    const response = await fetch('https://api.anthropic.com/v1/models', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch models from Anthropic API');
    }

    const data = await response.json();
    const models = data.data
      ?.map((model: any) => model.id)
      .filter((id: string) => id.includes('claude')) // Only Claude models
      .sort((a: string, b: string) => {
        // Prioritize newer Claude versions
        if (a.includes('claude-3-5')) return -1;
        if (b.includes('claude-3-5')) return 1;
        if (a.includes('claude-3') && !a.includes('3-5')) return -1;
        if (b.includes('claude-3') && !b.includes('3-5')) return 1;
        return a.localeCompare(b);
      }) || [];

    console.log(`Anthropic models returned:`, models?.slice(0, 5));

    return NextResponse.json(
      { models },
      { status: 200, headers: { 'Cache-Control': 'max-age=3600' } }
    );
  } catch (error) {
    console.error('Error fetching Anthropic models:', error);
    return NextResponse.json(
      { models: [] },
      { status: 200 }
    );
  }
}
