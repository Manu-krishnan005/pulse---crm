import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/campaigns — list all campaigns
export async function GET() {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        segment: { select: { name: true } },
        messageLogs: { select: { status: true } },
      },
    });
    return NextResponse.json(campaigns);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}


// POST /api/campaigns — create campaign
export async function POST(req: NextRequest) {
  try {
    const { name, segmentId, channel, goal, messageVariants, selectedVariant, channelSuggestion } =
      await req.json();

    if (!name || !segmentId || !channel || !goal || !messageVariants) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        segmentId,
        channel,
        goal,
        messageVariants,
        selectedVariant: selectedVariant || null,
        channelSuggestion: channelSuggestion || null,
        status: 'draft',
      },
      include: { segment: { select: { name: true } } },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error('Create campaign error:', error);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}
