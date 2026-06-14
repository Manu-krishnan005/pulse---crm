import { NextRequest, NextResponse } from 'next/server';
import { generateSegmentFilter, getMockSegmentFilter } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const { naturalLanguage } = await req.json();

    if (!naturalLanguage || typeof naturalLanguage !== 'string') {
      return NextResponse.json({ error: 'naturalLanguage is required' }, { status: 400 });
    }

    try {
      const result = await generateSegmentFilter(naturalLanguage);
      return NextResponse.json(result);
    } catch (aiError: unknown) {
      const message = aiError instanceof Error ? aiError.message : 'AI error';
      // If API key not set or rate limited, use mock
      if (message.includes('GEMINI_API_KEY') || message.includes('429') || message.includes('quota')) {
        console.warn('Using mock AI response:', message);
        const mock = getMockSegmentFilter(naturalLanguage);
        return NextResponse.json({ ...mock, _mock: true });
      }
      throw aiError;
    }
  } catch (error) {
    console.error('Segment filter error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate filter' },
      { status: 500 },
    );
  }
}
