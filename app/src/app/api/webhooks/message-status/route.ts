import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { logId, status, timestamp } = await req.json();

    if (!logId || !status || !timestamp) {
      return NextResponse.json({ error: 'logId, status, timestamp required' }, { status: 400 });
    }

    const validStatuses = ['pending', 'delivered', 'failed', 'opened', 'clicked', 'converted'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const log = await prisma.messageLog.findUnique({ where: { id: logId } });
    if (!log) {
      return NextResponse.json({ error: 'MessageLog not found' }, { status: 404 });
    }

    const currentHistory = Array.isArray(log.statusHistory)
      ? (log.statusHistory as Array<{ status: string; timestamp: string }>)
      : JSON.parse(log.statusHistory as string || '[]');

    const newEntry = { status, timestamp };
    const updatedHistory = [...currentHistory, newEntry];

    await prisma.messageLog.update({
      where: { id: logId },
      data: {
        status,
        statusHistory: updatedHistory,
      },
    });

    // Auto-complete campaign when all messages have settled (no more 'pending')
    const campaign = await prisma.campaign.findUnique({
      where: { id: log.campaignId },
      select: { id: true, status: true },
    });

    if (campaign && campaign.status === 'delivering') {
      const pendingCount = await prisma.messageLog.count({
        where: { campaignId: log.campaignId, status: 'pending' },
      });

      if (pendingCount === 0) {
        await prisma.campaign.update({
          where: { id: log.campaignId },
          data: { status: 'completed' },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

