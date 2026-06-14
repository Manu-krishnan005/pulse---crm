import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { filterGroupToPrismaWhere } from '@/lib/filter-to-prisma';
import { validateFilterGroup } from '@/lib/filter-schema';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { segment: true },
    });

    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    if (campaign.status !== 'draft') {
      return NextResponse.json({ error: 'Campaign already sent' }, { status: 400 });
    }
    if (!campaign.selectedVariant) {
      return NextResponse.json({ error: 'No message variant selected' }, { status: 400 });
    }

    // Get customers in segment
    const filterGroup = validateFilterGroup(campaign.segment.filterJson);
    const where = filterGroupToPrismaWhere(filterGroup);
    const customers = await prisma.customer.findMany({
      where,
      select: { id: true, name: true, email: true },
    });

    if (customers.length === 0) {
      return NextResponse.json({ error: 'No customers in this segment' }, { status: 400 });
    }

    // Create MessageLog entries
    const logData = customers.map((c) => ({
      campaignId: campaign.id,
      customerId: c.id,
      channel: campaign.channel,
      status: 'pending',
      statusHistory: JSON.stringify([{ status: 'pending', timestamp: new Date().toISOString() }]),
    }));

    await prisma.messageLog.createMany({ data: logData });

    // Fetch created logs for IDs
    const logs = await prisma.messageLog.findMany({
      where: { campaignId: campaign.id },
      select: { id: true, customerId: true },
    });

    // Update campaign status
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'delivering' },
    });

    // Send to channel service
    const channelServiceUrl = process.env.CHANNEL_SERVICE_URL || 'http://localhost:3001';
    const variant = campaign.selectedVariant as { content: string; subject?: string };

    const messages = logs.map((log) => {
      const customer = customers.find((c) => c.id === log.customerId);
      const content = variant.content.replace(/\[Name\]/g, customer?.name || 'Customer');
      return {
        logId: log.id,
        customerId: log.customerId,
        channel: campaign.channel,
        content,
        subject: variant.subject || undefined,
      };
    });

    try {
      const response = await fetch(`${channelServiceUrl}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id, messages }),
      });

      if (!response.ok) {
        console.warn('Channel service returned error, simulating locally');
        simulateLocalDelivery(logs.map((l) => l.id), campaign.id);
      }
    } catch {
      console.warn('Channel service unreachable, simulating delivery locally');
      simulateLocalDelivery(logs.map((l) => l.id), campaign.id);
    }

    return NextResponse.json({
      success: true,
      customerCount: customers.length,
      message: `Campaign sent to ${customers.length} customers`,
    });
  } catch (error) {
    console.error('Send campaign error:', error);
    return NextResponse.json({ error: 'Failed to send campaign' }, { status: 500 });
  }
}

// Local simulation fallback when channel service is unavailable
async function simulateLocalDelivery(logIds: string[], campaignId: string) {
  const CHANNEL_URL = process.env.CRM_WEBHOOK_URL || 'http://localhost:3000/api/webhooks/message-status';

  for (const logId of logIds) {
    // Simulate async delivery pipeline
    const failed = Math.random() < 0.1; // 10% fail rate

    setTimeout(async () => {
      const status = failed ? 'failed' : 'delivered';
      await sendWebhook(CHANNEL_URL, { logId, status, timestamp: new Date().toISOString() });

      if (!failed) {
        const opened = Math.random() < 0.6;
        if (opened) {
          setTimeout(async () => {
            await sendWebhook(CHANNEL_URL, { logId, status: 'opened', timestamp: new Date().toISOString() });

            const clicked = Math.random() < 0.4;
            if (clicked) {
              setTimeout(async () => {
                await sendWebhook(CHANNEL_URL, { logId, status: 'clicked', timestamp: new Date().toISOString() });

                const converted = Math.random() < 0.25;
                if (converted) {
                  setTimeout(async () => {
                    await sendWebhook(CHANNEL_URL, { logId, status: 'converted', timestamp: new Date().toISOString() });
                  }, randomDelay(30000, 90000));
                }
              }, randomDelay(10000, 45000));
            }
          }, randomDelay(5000, 20000));
        }
      }
    }, randomDelay(1000, 5000));
  }

  // Update campaign status to completed after all messages processed
  setTimeout(async () => {
    try {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'completed' },
      });
    } catch {
      // ignore
    }
  }, 180000); // 3 minutes
}

function randomDelay(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function sendWebhook(url: string, payload: object) {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error('Webhook send failed:', e);
  }
}
