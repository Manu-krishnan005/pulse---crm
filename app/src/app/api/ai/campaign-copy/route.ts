import { NextRequest, NextResponse } from 'next/server';
import { generateCampaignCopy } from '@/lib/gemini';
import { prisma } from '@/lib/prisma';
import { filterGroupToPrismaWhere } from '@/lib/filter-to-prisma';
import { validateFilterGroup } from '@/lib/filter-schema';

export async function POST(req: NextRequest) {
  let channel = 'sms';
  try {
    const body = await req.json();
    const { segmentId, goal } = body;
    channel = body.channel || 'sms';

    if (!segmentId || !goal || !channel) {
      return NextResponse.json({ error: 'segmentId, goal, channel required' }, { status: 400 });
    }

    const segment = await prisma.segment.findUnique({ where: { id: segmentId } });
    if (!segment) return NextResponse.json({ error: 'Segment not found' }, { status: 404 });

    const filterGroup = validateFilterGroup(segment.filterJson);
    const where = filterGroupToPrismaWhere(filterGroup);
    const audienceCount = await prisma.customer.count({ where });

    const result = await generateCampaignCopy({
      segmentDescription: segment.description || segment.name,
      goal,
      channel,
      audienceCount,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Campaign copy error:', error);

    // Mock fallback — use the channel variable captured before try block
    const mockVariants = getMockVariants(channel);
    return NextResponse.json({ variants: mockVariants, _mock: true });
  }
}

function getMockVariants(channel: string) {
  if (channel === 'sms') {
    return [
      { id: 'v1', subject: null, content: 'Hi [Name]! We miss you 💙 Come back & enjoy 20% off your next order. Shop now: pulse.store/sale | Reply STOP to opt out', preview: 'Hi [Name]! We miss you', tone: 'warm' },
      { id: 'v2', subject: null, content: '[Name], your exclusive offer expires TODAY! 🔥 Get 20% off everything. Tap: pulse.store | STOP to opt out', preview: 'Your exclusive offer expires', tone: 'urgent' },
      { id: 'v3', subject: null, content: 'Hello [Name]. As a valued customer, enjoy 20% off your next purchase. Visit pulse.store to redeem. Reply STOP to unsubscribe.', preview: 'Hello [Name]. As a valued customer', tone: 'formal' },
    ];
  }
  if (channel === 'email') {
    return [
      { id: 'v1', subject: 'We miss you, [Name]! Here\'s 20% off 💙', content: 'Dear [Name],\n\nIt\'s been a while and we miss you! As one of our valued customers, we\'d love to welcome you back with an exclusive 20% discount on your next order.\n\nUse code: COMEBACK20\n\nShop now and discover what\'s new!\n\nWarm regards,\nThe Pulse Team', preview: 'Dear [Name], It\'s been a while', tone: 'warm' },
      { id: 'v2', subject: '⏰ Your exclusive deal expires in 48 hours', content: '[Name],\n\nDon\'t let this slip by! Your exclusive 20% off offer is valid for just 48 more hours.\n\n🔥 Shop now before it\'s gone!\n\nCode: FLASH20\n\nThe Pulse Team', preview: 'Don\'t let this slip by', tone: 'urgent' },
      { id: 'v3', subject: 'A special thank you for being with us', content: 'Hello [Name],\n\nThank you for being part of the Pulse community. We appreciate your loyalty and want to reward you with 20% off your next purchase.\n\nExplore our latest arrivals and find something you\'ll love.\n\nBest,\nThe Pulse Team', preview: 'Thank you for being part of the Pulse', tone: 'formal' },
    ];
  }
  return [
    { id: 'v1', subject: null, content: 'Hey [Name]! 👋 We miss you! Come back and enjoy 20% off everything — just for you. Tap here to shop 👉', preview: 'Hey [Name]! We miss you!', tone: 'casual' },
    { id: 'v2', subject: null, content: '[Name], your exclusive 20% off offer is waiting! ⏳ Don\'t miss out — this deal is only for our most valued customers. Shop now!', preview: 'Your exclusive offer is waiting', tone: 'urgent' },
    { id: 'v3', subject: null, content: 'Hi [Name] 😊 It\'s been a while! We\'d love to see you again. Here\'s a little something from us — 20% off your next order. Come say hello!', preview: 'Hi [Name] It\'s been a while', tone: 'warm' },
  ];
}
