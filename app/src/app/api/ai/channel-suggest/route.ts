import { NextRequest, NextResponse } from 'next/server';
import { generateChannelSuggestion } from '@/lib/gemini';
import { prisma } from '@/lib/prisma';
import { filterGroupToPrismaWhere } from '@/lib/filter-to-prisma';
import { validateFilterGroup } from '@/lib/filter-schema';

export async function POST(req: NextRequest) {
  try {
    const { segmentId } = await req.json();
    if (!segmentId) return NextResponse.json({ error: 'segmentId required' }, { status: 400 });

    const segment = await prisma.segment.findUnique({ where: { id: segmentId } });
    if (!segment) return NextResponse.json({ error: 'Segment not found' }, { status: 404 });

    const filterGroup = validateFilterGroup(segment.filterJson);
    const where = filterGroupToPrismaWhere(filterGroup);

    const customers = await prisma.customer.findMany({
      where,
      select: { id: true },
    });

    const customerIds = customers.map((c) => c.id);

    const engagements = await prisma.engagementHistory.findMany({
      where: { customerId: { in: customerIds } },
    });

    // Aggregate per channel
    const channelStats: Record<string, { opens: number; clicks: number; total: number }> = {
      whatsapp: { opens: 0, clicks: 0, total: 0 },
      sms: { opens: 0, clicks: 0, total: 0 },
      email: { opens: 0, clicks: 0, total: 0 },
      rcs: { opens: 0, clicks: 0, total: 0 },
    };

    for (const eng of engagements) {
      const ch = eng.channel.toLowerCase();
      if (channelStats[ch]) {
        channelStats[ch].opens += eng.opens;
        channelStats[ch].clicks += eng.clicks;
        channelStats[ch].total += 1;
      }
    }

    try {
      const result = await generateChannelSuggestion({
        segmentName: segment.name,
        channelStats,
      });
      return NextResponse.json(result);
    } catch {
      // Mock fallback: pick channel with most opens
      const computedStats = Object.fromEntries(
        Object.entries(channelStats).map(([ch, s]) => [
          ch,
          {
            openRate: s.total > 0 ? Math.round((s.opens / s.total) * 100) : 0,
            clickRate: s.total > 0 ? Math.round((s.clicks / s.total) * 100) : 0,
          },
        ]),
      );

      const best = Object.entries(channelStats).sort(([, a], [, b]) => (b.opens + b.clicks) - (a.opens + a.clicks))[0];
      const channel = best[0];
      const winnerStats = computedStats[channel];
      const secondBest = Object.entries(computedStats)
        .filter(([ch]) => ch !== channel)
        .sort(([, a], [, b]) => (b.openRate + b.clickRate) - (a.openRate + a.clickRate))[0];

      const multiplier = secondBest && (secondBest[1].openRate > 0)
        ? (winnerStats.openRate / secondBest[1].openRate).toFixed(1)
        : null;

      const reasoning = `${channel.charAt(0).toUpperCase() + channel.slice(1)} leads this segment with a ${winnerStats.openRate}% open rate and ${winnerStats.clickRate}% click rate.${multiplier && secondBest ? ` This is ${multiplier}× higher open rate than ${secondBest[0].charAt(0).toUpperCase() + secondBest[0].slice(1)} (${secondBest[1].openRate}%).` : ''} Customers in this segment historically respond better on ${channel}, making it the most efficient channel for your next campaign.`;

      return NextResponse.json({
        suggestedChannel: channel,
        rationale: `${channel.charAt(0).toUpperCase() + channel.slice(1)} has the strongest engagement signal for this segment`,
        reasoning,
        confidence: 'medium',
        stats: computedStats,
        _mock: true,
      });
    }
  } catch (error) {
    console.error('Channel suggest error:', error);
    return NextResponse.json({ error: 'Failed to suggest channel' }, { status: 500 });
  }
}
