import { NextRequest, NextResponse } from 'next/server';
import { generatePerformanceSummary } from '@/lib/gemini';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { campaignId } = await req.json();
    if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 });

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { messageLogs: true },
    });
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    const logs = campaign.messageLogs;
    const stats = {
      total: logs.length,
      delivered: logs.filter((l) => ['delivered', 'opened', 'clicked', 'converted'].includes(l.status)).length,
      failed: logs.filter((l) => l.status === 'failed').length,
      opened: logs.filter((l) => ['opened', 'clicked', 'converted'].includes(l.status)).length,
      clicked: logs.filter((l) => ['clicked', 'converted'].includes(l.status)).length,
      converted: logs.filter((l) => l.status === 'converted').length,
    };

    const result = await generatePerformanceSummary({
      campaignName: campaign.name,
      channel: campaign.channel,
      goal: campaign.goal,
      stats,
    });

    return NextResponse.json({ ...result, stats });
  } catch (error) {
    console.error('Performance summary error:', error);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}
