export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Users, Megaphone, TrendingUp, ArrowRight, Zap, Sparkles, BarChart2 } from 'lucide-react';

async function getDashboardStats() {
  const [customerCount, campaignCount, segmentCount, recentCampaigns, recentLogs] =
    await Promise.all([
      prisma.customer.count(),
      prisma.campaign.count(),
      prisma.segment.count(),
      prisma.campaign.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          segment: { select: { name: true } },
          _count: { select: { messageLogs: true } },
        },
      }),
      prisma.messageLog.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
    ]);

  // Fetch recent campaigns that had AI channel suggestions (safe query)
  let aiCampaigns: Array<{
    id: string;
    name: string;
    channel: string;
    goal: string;
    channelSuggestion: unknown;
    createdAt: Date;
    segment: { name: string };
  }> = [];
  try {
    const raw = await prisma.campaign.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      where: { NOT: [{ channelSuggestion: { equals: 'null' } }] },
      select: {
        id: true,
        name: true,
        channel: true,
        goal: true,
        channelSuggestion: true,
        createdAt: true,
        segment: { select: { name: true } },
      },
    });
    aiCampaigns = raw as unknown as typeof aiCampaigns;
  } catch {
    // ignore
  }

  const logStats = Object.fromEntries(recentLogs.map((l) => [l.status, l._count.status]));

  return { customerCount, campaignCount, segmentCount, recentCampaigns, logStats, aiCampaigns };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; badgeClass: string }> = {
  draft: { label: 'Draft', color: 'text-gray-400', badgeClass: 'badge-gray' },
  delivering: { label: 'Delivering', color: 'text-amber-400', badgeClass: 'badge-amber' },
  completed: { label: 'Completed', color: 'text-emerald-400', badgeClass: 'badge-emerald' },
};

const CHANNEL_ICONS: Record<string, string> = { whatsapp: '💬', sms: '📱', email: '📧', rcs: '✨' };
const GOAL_LABELS: Record<string, string> = {
  'win-back': 'Win-Back',
  'upsell': 'Upsell',
  'new-arrival': 'New Arrival',
  'retention': 'Retention',
  'promotional': 'Promotional',
};

export default async function DashboardPage() {
  const { customerCount, campaignCount, segmentCount, recentCampaigns, logStats, aiCampaigns } =
    await getDashboardStats();

  const totalMessages = Object.values(logStats).reduce((a, b) => a + b, 0);
  const deliveredMessages = (logStats.delivered || 0) + (logStats.opened || 0) +
    (logStats.clicked || 0) + (logStats.converted || 0);
  const openedMessages = (logStats.opened || 0) + (logStats.clicked || 0) + (logStats.converted || 0);
  const clickedMessages = (logStats.clicked || 0) + (logStats.converted || 0);

  const deliveryRate = totalMessages > 0 ? Math.round((deliveredMessages / totalMessages) * 100) : 0;
  const openRate = deliveredMessages > 0 ? Math.round((openedMessages / deliveredMessages) * 100) : 0;
  const clickRate = openedMessages > 0 ? Math.round((clickedMessages / openedMessages) * 100) : 0;

  const stats = [
    {
      label: 'Total Customers',
      value: customerCount.toLocaleString(),
      icon: Users,
      color: 'from-indigo-500 to-violet-500',
      change: `${segmentCount} segments created`,
    },
    {
      label: 'Campaigns',
      value: campaignCount.toLocaleString(),
      icon: Megaphone,
      color: 'from-cyan-500 to-blue-500',
      change: `${recentCampaigns.filter((c) => c.status === 'delivering').length} delivering now`,
    },
    {
      label: 'Delivery Rate',
      value: `${deliveryRate}%`,
      icon: TrendingUp,
      color: 'from-emerald-500 to-teal-500',
      change: `${totalMessages.toLocaleString()} messages total`,
    },
    {
      label: 'Avg Open Rate',
      value: totalMessages > 0 ? `${openRate}%` : '—',
      icon: BarChart2,
      color: 'from-amber-500 to-orange-500',
      change: totalMessages > 0 ? `${clickRate}% click-through` : 'No campaigns yet',
    },
  ];

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' :
    hour < 17 ? 'Good afternoon' :
    'Good evening';

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">
          {greeting} 👋
        </h1>
        <p className="text-gray-400 mt-1">
          Here&apos;s what&apos;s happening with your campaigns today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-5 hover:shadow-card-hover transition-all duration-300 group">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{stat.label}</p>
                <p className="text-3xl font-bold text-white mt-2">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.change}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg opacity-80 group-hover:opacity-100 transition-opacity`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Recent campaigns */}
        <div className="col-span-2 card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Recent Campaigns</h2>
            <Link href="/campaigns" className="text-xs text-accent-from hover:text-accent-to transition-colors flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentCampaigns.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No campaigns yet</p>
              <Link href="/campaigns/new" className="btn-primary mt-3 text-xs inline-flex">
                Create your first campaign
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentCampaigns.map((campaign) => {
                const cfg = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
                return (
                  <Link
                    key={campaign.id}
                    href={`/campaigns/${campaign.id}`}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-raised transition-colors group"
                  >
                    <div className={`w-2 h-2 rounded-full ${
                      campaign.status === 'delivering' ? 'bg-amber-400 animate-pulse' :
                      campaign.status === 'completed' ? 'bg-emerald-400' : 'bg-gray-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate group-hover:text-white transition-colors">
                        {campaign.name}
                      </p>
                      <p className="text-xs text-gray-500">{campaign.segment.name}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`badge ${cfg.badgeClass}`}>{cfg.label}</span>
                      <span className="text-xs text-gray-500">{campaign._count.messageLogs} msgs</span>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 transition-colors" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* AI Decisions feed */}
          <div className="ai-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-accent-from" />
              <span className="text-xs font-semibold text-accent-from uppercase tracking-wider">Recent AI Decisions</span>
            </div>
            {aiCampaigns.length === 0 ? (
              <>
                <h3 className="text-sm font-semibold text-white mb-1">Build an Audience</h3>
                <p className="text-xs text-gray-400 mb-4">
                  Describe your audience in plain English. AI generates the filters instantly.
                </p>
                <Link href="/audience" className="btn-primary text-xs w-full justify-center">
                  Go to Audience Builder
                </Link>
              </>
            ) : (
              <div className="space-y-3">
                {aiCampaigns.map((c) => {
                  let suggestion: { suggestedChannel?: string; confidence?: string } = {};
                  try { suggestion = JSON.parse(c.channelSuggestion as string); } catch { /* */ }
                  return (
                    <Link
                      key={c.id}
                      href={`/campaigns/${c.id}`}
                      className="block p-3 rounded-lg bg-surface-raised/50 border border-surface-border/50 hover:border-accent/30 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-200 truncate group-hover:text-white">
                          {c.name}
                        </span>
                        <span className="text-lg shrink-0 ml-2">{CHANNEL_ICONS[c.channel] || '📨'}</span>
                      </div>
                      <p className="text-[10px] text-gray-500">
                        {c.segment.name} · {GOAL_LABELS[c.goal] || c.goal}
                      </p>
                      {suggestion.suggestedChannel && (
                        <p className="text-[10px] mt-1.5 text-indigo-400">
                          AI picked {suggestion.suggestedChannel}
                          {suggestion.confidence ? ` · ${suggestion.confidence} confidence` : ''}
                        </p>
                      )}
                    </Link>
                  );
                })}
                <Link href="/campaigns/new" className="btn-primary text-xs w-full justify-center">
                  <Zap className="w-3.5 h-3.5" /> New AI Campaign
                </Link>
              </div>
            )}
          </div>

          {/* Message funnel */}
          {totalMessages > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Overall Funnel</h3>
              <div className="space-y-2.5">
                {[
                  { label: 'Sent', value: totalMessages, color: 'bg-indigo-500' },
                  { label: 'Delivered', value: deliveredMessages, color: 'bg-blue-500' },
                  { label: 'Opened', value: openedMessages, color: 'bg-emerald-500' },
                  { label: 'Clicked', value: clickedMessages, color: 'bg-cyan-500' },
                  { label: 'Converted', value: logStats.converted || 0, color: 'bg-violet-500' },
                ].map((row) => {
                  const pct = totalMessages > 0 ? Math.round((row.value / totalMessages) * 100) : 0;
                  return (
                    <div key={row.label} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-20 shrink-0">{row.label}</span>
                      <div className="flex-1 h-1.5 bg-surface-raised rounded-full overflow-hidden">
                        <div
                          className={`h-full ${row.color} rounded-full transition-all duration-1000`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-500 w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick new campaign (only when no messages yet) */}
          {totalMessages === 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-white mb-1">New Campaign</h3>
              <p className="text-xs text-gray-400 mb-4">
                AI generates 3 message variants for WhatsApp, SMS, Email, or RCS.
              </p>
              <Link href="/campaigns/new" className="btn-secondary text-xs w-full justify-center">
                Create Campaign
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
