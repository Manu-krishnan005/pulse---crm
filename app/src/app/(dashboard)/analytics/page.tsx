'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadialBarChart, RadialBar, Legend,
  Cell
} from 'recharts';
import {
  BarChart3, ArrowRight, TrendingUp, TrendingDown, Minus,
  Sparkles, Loader2, Send, Target, MousePointer, ShoppingCart
} from 'lucide-react';
import clsx from 'clsx';

interface CampaignAnalytics {
  id: string;
  name: string;
  channel: string;
  goal: string;
  status: string;
  createdAt: string;
  segment: { name: string };
  messageLogs: Array<{ status: string }>;
}

const CHANNEL_ICONS: Record<string, string> = { whatsapp: '💬', sms: '📱', email: '📧', rcs: '✨' };

function computeStats(logs: Array<{ status: string }>) {
  const total = logs.length;
  const delivered = logs.filter((l) => ['delivered', 'opened', 'clicked', 'converted'].includes(l.status)).length;
  const opened = logs.filter((l) => ['opened', 'clicked', 'converted'].includes(l.status)).length;
  const clicked = logs.filter((l) => ['clicked', 'converted'].includes(l.status)).length;
  const converted = logs.filter((l) => l.status === 'converted').length;
  const failed = logs.filter((l) => l.status === 'failed').length;
  const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
  const openRate = delivered > 0 ? Math.round((opened / delivered) * 100) : 0;
  const clickRate = opened > 0 ? Math.round((clicked / opened) * 100) : 0;
  return { total, delivered, opened, clicked, converted, failed, deliveryRate, openRate, clickRate };
}

// Channel breakdown chart data
function buildChannelData(campaigns: CampaignAnalytics[]) {
  const map: Record<string, { channel: string; deliveryRate: number; openRate: number; clickRate: number; count: number }> = {};
  for (const c of campaigns) {
    const ch = c.channel;
    if (!map[ch]) map[ch] = { channel: ch.toUpperCase(), deliveryRate: 0, openRate: 0, clickRate: 0, count: 0 };
    const s = computeStats(c.messageLogs);
    if (s.total > 0) {
      map[ch].deliveryRate += s.deliveryRate;
      map[ch].openRate += s.openRate;
      map[ch].clickRate += s.clickRate;
      map[ch].count++;
    }
  }
  return Object.values(map).map((d) => ({
    ...d,
    deliveryRate: d.count > 0 ? Math.round(d.deliveryRate / d.count) : 0,
    openRate: d.count > 0 ? Math.round(d.openRate / d.count) : 0,
    clickRate: d.count > 0 ? Math.round(d.clickRate / d.count) : 0,
  }));
}

const CHART_COLORS = ['#6366f1', '#10b981', '#22d3ee', '#f59e0b'];

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-navy-800 border border-surface-border rounded-lg p-3 shadow-card text-xs">
        <p className="text-white font-medium mb-1">{label}</p>
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-2 mt-0.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-gray-400">{p.name}:</span>
            <span className="text-white font-medium">{p.value}%</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const [campaigns, setCampaigns] = useState<CampaignAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics');
      if (res.ok) {
        const data = await res.json();
        setCampaigns(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-2 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading analytics…
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="p-8 space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-gray-400 mt-1 text-sm">Campaign performance overview</p>
        </div>
        <div className="card p-16 text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-600 opacity-50" />
          <h3 className="text-lg font-medium text-gray-300">No campaign data yet</h3>
          <p className="text-gray-500 text-sm mt-1 mb-6">Send a campaign to see analytics here.</p>
          <Link href="/campaigns/new" className="btn-primary inline-flex">Create Campaign</Link>
        </div>
      </div>
    );
  }

  // Aggregate totals across all campaigns
  const allLogs = campaigns.flatMap((c) => c.messageLogs);
  const aggregate = computeStats(allLogs);
  const channelData = buildChannelData(campaigns);

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-gray-400 mt-1 text-sm">
          {campaigns.length} campaigns · {aggregate.total.toLocaleString()} messages total
        </p>
      </div>

      {/* Aggregate KPI row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Sent', value: aggregate.total.toLocaleString(), icon: Send, color: 'from-indigo-500 to-violet-500', sub: `${campaigns.length} campaigns` },
          { label: 'Delivery Rate', value: `${aggregate.deliveryRate}%`, icon: TrendingUp, color: 'from-blue-500 to-cyan-500', sub: `${aggregate.delivered} delivered` },
          { label: 'Open Rate', value: `${aggregate.openRate}%`, icon: Target, color: 'from-emerald-500 to-teal-500', sub: `${aggregate.opened} opens` },
          { label: 'Conversions', value: aggregate.converted.toLocaleString(), icon: ShoppingCart, color: 'from-violet-500 to-pink-500', sub: `${aggregate.clickRate}% click rate` },
        ].map((s) => (
          <div key={s.label} className="card p-4 hover:shadow-card-hover transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">{s.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{s.value}</p>
                <p className="text-xs text-gray-600 mt-0.5">{s.sub}</p>
              </div>
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                <s.icon className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Channel Breakdown Chart */}
      {channelData.length > 0 && (
        <div className="card p-6">
          <h2 className="text-base font-semibold text-white mb-4">Channel Performance (Avg. Rates)</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                <XAxis dataKey="channel" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                <Bar dataKey="deliveryRate" name="Delivery" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={48} />
                <Bar dataKey="openRate" name="Open" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={48} />
                <Bar dataKey="clickRate" name="Click" fill="#22d3ee" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Per-campaign cards */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-white">Campaign Breakdown</h2>
        {campaigns.map((campaign) => {
          const s = computeStats(campaign.messageLogs);
          const metrics = [
            { label: 'Delivery', value: s.deliveryRate, benchmark: 85, unit: '%' },
            { label: 'Open Rate', value: s.openRate, benchmark: 30, unit: '%' },
            { label: 'Click Rate', value: s.clickRate, benchmark: 20, unit: '%' },
            { label: 'Conversions', value: s.converted, benchmark: null, unit: '' },
          ];

          const funnelData = [
            { name: 'Delivered', value: s.delivered, fill: '#6366f1' },
            { name: 'Opened', value: s.opened, fill: '#10b981' },
            { name: 'Clicked', value: s.clicked, fill: '#22d3ee' },
            { name: 'Converted', value: s.converted, fill: '#8b5cf6' },
          ].filter((d) => d.value > 0);

          return (
            <Link
              key={campaign.id}
              href={`/campaigns/${campaign.id}`}
              className="card p-6 block hover:shadow-card-hover hover:border-accent/20 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{CHANNEL_ICONS[campaign.channel] || '📨'}</span>
                  <div>
                    <h3 className="text-base font-semibold text-gray-200 group-hover:text-white">{campaign.name}</h3>
                    <p className="text-xs text-gray-500">{campaign.segment.name} · {campaign.channel.toUpperCase()} · {s.total} customers</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {campaign.status === 'completed' && <span className="badge-emerald">Completed</span>}
                  {campaign.status === 'delivering' && <span className="badge-amber">Delivering</span>}
                  {campaign.status === 'draft' && <span className="badge-gray">Draft</span>}
                  <div className="flex items-center gap-1 text-xs text-indigo-400 group-hover:text-indigo-300">
                    <Sparkles className="w-3 h-3" />
                    View AI Summary
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                </div>
              </div>

              {s.total > 0 ? (
                <div className="grid grid-cols-5 gap-4">
                  {/* Metrics */}
                  <div className="col-span-3 grid grid-cols-4 gap-4">
                    {metrics.map((m) => {
                      const isGood = m.benchmark !== null ? m.value >= m.benchmark : null;
                      return (
                        <div key={m.label} className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-2xl font-bold text-white">{m.value}{m.unit}</span>
                            {isGood !== null && (
                              isGood ? <TrendingUp className="w-4 h-4 text-emerald-400" /> :
                              m.value > 0 ? <Minus className="w-4 h-4 text-amber-400" /> :
                              <TrendingDown className="w-4 h-4 text-rose-400" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{m.label}</p>
                          {m.benchmark && (
                            <p className="text-[10px] text-gray-600">Benchmark: {m.benchmark}%</p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Funnel mini chart */}
                  <div className="col-span-2">
                    {funnelData.length > 0 && (
                      <div className="h-28">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadialBarChart
                            cx="50%"
                            cy="50%"
                            innerRadius="30%"
                            outerRadius="90%"
                            data={funnelData.map((d) => ({ ...d, value: s.total > 0 ? Math.round((d.value / s.total) * 100) : 0 }))}
                            startAngle={90}
                            endAngle={-270}
                          >
                            <RadialBar dataKey="value" cornerRadius={3} background={{ fill: '#1f2937' }} />
                            <Tooltip
                              formatter={(val) => `${val}%`}
                              contentStyle={{ background: '#0d1526', border: '1px solid #2d3748', borderRadius: 8, fontSize: 11 }}
                              itemStyle={{ color: '#e5e7eb' }}
                            />
                          </RadialBarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">No messages sent yet</p>
              )}

              {/* Mini funnel bar */}
              {s.total > 0 && (
                <div className="mt-4 flex h-1.5 rounded-full overflow-hidden bg-surface-raised gap-px">
                  {[
                    { value: s.delivered - s.opened - s.failed, color: 'bg-blue-500' },
                    { value: s.opened - s.clicked, color: 'bg-emerald-500' },
                    { value: s.clicked - s.converted, color: 'bg-cyan-500' },
                    { value: s.converted, color: 'bg-violet-500' },
                    { value: s.failed, color: 'bg-rose-500' },
                  ].map((seg, i) => seg.value > 0 && (
                    <div key={i} className={`${seg.color} transition-all`} style={{ flex: seg.value }} />
                  ))}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
