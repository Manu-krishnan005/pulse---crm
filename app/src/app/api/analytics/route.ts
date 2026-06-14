import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/analytics — all campaigns with message log statuses for analytics
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
    console.error('Analytics fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
