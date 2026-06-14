'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus, Megaphone, ArrowRight, Send, Clock, CheckCircle2,
  XCircle, Trash2, Loader2, AlertCircle
} from 'lucide-react';
import clsx from 'clsx';

interface Campaign {
  id: string;
  name: string;
  status: string;
  channel: string;
  goal: string;
  createdAt: string;
  segment: { name: string };
  messageLogs: Array<{ status: string }>;
}

const CHANNEL_ICONS: Record<string, string> = {
  whatsapp: '💬',
  sms: '📱',
  email: '📧',
  rcs: '✨',
};

const GOAL_LABELS: Record<string, string> = {
  'win-back': 'Win-Back',
  'upsell': 'Upsell',
  'new-arrival': 'New Arrival',
  'retention': 'Retention',
  'promotional': 'Promotional',
};

function CampaignStats({ logs }: { logs: Array<{ status: string }> }) {
  const total = logs.length;
  if (total === 0) return <span className="text-xs text-gray-600">No messages sent</span>;

  const delivered = logs.filter((l) =>
    ['delivered', 'opened', 'clicked', 'converted'].includes(l.status),
  ).length;
  const failed = logs.filter((l) => l.status === 'failed').length;
  const opened = logs.filter((l) =>
    ['opened', 'clicked', 'converted'].includes(l.status),
  ).length;
  const clicked = logs.filter((l) => ['clicked', 'converted'].includes(l.status)).length;

  const deliveryPct = Math.round((delivered / total) * 100);
  const openPct = delivered > 0 ? Math.round((opened / delivered) * 100) : 0;
  const clickPct = opened > 0 ? Math.round((clicked / opened) * 100) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        {/* Progress bar */}
        <div className="flex-1 flex h-1.5 rounded-full overflow-hidden bg-surface-raised">
          <div className="bg-blue-500 h-full transition-all" style={{ width: `${deliveryPct}%` }} />
          <div className="bg-emerald-500 h-full transition-all" style={{ width: `${openPct * deliveryPct / 100}%` }} />
          <div className="bg-cyan-500 h-full transition-all" style={{ width: `${clickPct * openPct * deliveryPct / 10000}%` }} />
        </div>
        <span className="text-xs text-gray-500 shrink-0">{total} msgs</span>
      </div>
      <div className="flex gap-3 text-xs text-gray-500">
        <span className="text-blue-400">{deliveryPct}% delivered</span>
        <span className="text-emerald-400">{openPct}% opened</span>
        <span className="text-cyan-400">{clickPct}% clicked</span>
        {failed > 0 && <span className="text-rose-400">{failed} failed</span>}
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch('/api/campaigns');
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

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete campaign "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const byStatus = {
    draft: campaigns.filter((c) => c.status === 'draft').length,
    delivering: campaigns.filter((c) => c.status === 'delivering').length,
    completed: campaigns.filter((c) => c.status === 'completed').length,
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-2 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading campaigns…
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Campaigns</h1>
          <p className="text-gray-400 mt-1 text-sm">
            {campaigns.length} campaigns total
          </p>
        </div>
        <Link href="/campaigns/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          New Campaign
        </Link>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Draft', count: byStatus.draft, icon: Clock, color: 'text-gray-400', bg: 'bg-gray-500/10' },
          { label: 'Delivering', count: byStatus.delivering, icon: Send, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Completed', count: byStatus.completed, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        ].map((s) => (
          <div key={s.label} className={`card p-4 flex items-center gap-3 ${s.bg}`}>
            <s.icon className={`w-5 h-5 ${s.color}`} />
            <div>
              <div className="text-xl font-bold text-white">{s.count}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {deleteError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {deleteError}
          <button onClick={() => setDeleteError(null)} className="ml-auto text-rose-400 hover:text-rose-300">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Campaign list */}
      {campaigns.length === 0 ? (
        <div className="card p-16 text-center">
          <Megaphone className="w-12 h-12 mx-auto mb-4 text-gray-600 opacity-50" />
          <h3 className="text-lg font-medium text-gray-300">No campaigns yet</h3>
          <p className="text-gray-500 text-sm mt-1 mb-6">
            Create your first campaign with AI-generated copy.
          </p>
          <Link href="/campaigns/new" className="btn-primary inline-flex">
            <Plus className="w-4 h-4" /> Create Campaign
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="card p-5 flex items-center gap-5 hover:shadow-card-hover hover:border-accent/20 transition-all group animate-slide-up"
            >
              {/* Channel icon */}
              <Link href={`/campaigns/${campaign.id}`} className="flex-1 flex items-center gap-5 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-surface-raised flex items-center justify-center text-xl shrink-0">
                  {CHANNEL_ICONS[campaign.channel] || '📨'}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-200 group-hover:text-white truncate">
                      {campaign.name}
                    </h3>
                    <span className="badge-gray text-[10px]">
                      {GOAL_LABELS[campaign.goal] || campaign.goal}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {campaign.segment.name} · {campaign.channel.toUpperCase()}
                  </p>
                  <div className="mt-2">
                    <CampaignStats logs={campaign.messageLogs} />
                  </div>
                </div>

                {/* Status + date */}
                <div className="text-right shrink-0 space-y-1">
                  <div>
                    {campaign.status === 'draft' && <span className="badge-gray">Draft</span>}
                    {campaign.status === 'delivering' && (
                      <span className="badge-amber flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Delivering
                      </span>
                    )}
                    {campaign.status === 'completed' && <span className="badge-emerald">Completed</span>}
                  </div>
                  <p className="text-xs text-gray-600">
                    {new Date(campaign.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors shrink-0" />
              </Link>

              {/* Delete button */}
              <button
                onClick={(e) => { e.preventDefault(); handleDelete(campaign.id, campaign.name); }}
                disabled={deletingId === campaign.id}
                className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 transition-all shrink-0 ml-1"
                title="Delete campaign"
              >
                {deletingId === campaign.id
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
