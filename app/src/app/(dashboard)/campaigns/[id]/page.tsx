'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Send, RefreshCw, Loader2, Sparkles, AlertCircle, ArrowLeft,
  Check, Clock, XCircle, Eye, MousePointer, ShoppingCart, ChevronDown, ChevronUp
} from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';

type StatusHistoryEntry = { status: string; timestamp: string };
type MessageLog = {
  id: string;
  status: string;
  channel: string;
  statusHistory: StatusHistoryEntry[];
  customer: { id: string; name: string; email: string };
  createdAt: string;
};
type Campaign = {
  id: string;
  name: string;
  status: string;
  channel: string;
  goal: string;
  selectedVariant: { content: string; subject?: string; tone: string } | null;
  segment: { id: string; name: string; description?: string };
  messageLogs: MessageLog[];
  createdAt: string;
};

type AISummary = {
  summary: string;
  suggestion: string;
  sentiment: string;
  highlights: string[];
  stats: {
    total: number;
    delivered: number;
    failed: number;
    opened: number;
    clicked: number;
    converted: number;
  };
};

const PIPELINE_STAGES = ['pending', 'delivered', 'opened', 'clicked', 'converted'];

const STATUS_ICON: Record<string, React.ElementType> = {
  pending: Clock,
  delivered: Check,
  opened: Eye,
  clicked: MousePointer,
  converted: ShoppingCart,
  failed: XCircle,
};

const STAGE_LABELS: Record<string, string> = {
  pending: 'Pending',
  delivered: 'Delivered',
  opened: 'Opened',
  clicked: 'Clicked',
  converted: 'Converted',
  failed: 'Failed',
};

function StatusCell({ status, timestamp }: { status: string | null; timestamp?: string }) {
  if (!status) return <td className="table-cell"><div className="pipeline-cell pipeline-pending text-[10px] text-gray-600">—</div></td>;

  return (
    <td className="table-cell">
      <div className={clsx('pipeline-cell text-[10px]', `pipeline-${status}`)}>
        <div>{STAGE_LABELS[status] || status}</div>
        {timestamp && (
          <div className="text-gray-500 text-[9px] mt-0.5">
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        )}
      </div>
    </td>
  );
}

function getStatusAtStage(log: MessageLog, stage: string): { reached: boolean; timestamp?: string } {
  const history = Array.isArray(log.statusHistory) ? log.statusHistory : [];
  const entry = history.find((h) => h.status === stage);
  if (entry) return { reached: true, timestamp: entry.timestamp };
  if (stage === 'failed' && history.some((h) => h.status === 'failed')) {
    return { reached: true, timestamp: history.find((h) => h.status === 'failed')?.timestamp };
  }
  return { reached: false };
}

function PipelineTable({ logs }: { logs: MessageLog[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? logs : logs.slice(0, 20);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="table-header text-left">Customer</th>
              {PIPELINE_STAGES.map((stage) => (
                <th key={stage} className="table-header text-center">
                  <div className="flex items-center justify-center gap-1">
                    {(() => { const Icon = STATUS_ICON[stage]; return <Icon className="w-3 h-3" />; })()}
                    {STAGE_LABELS[stage]}
                  </div>
                </th>
              ))}
              <th className="table-header text-center">Failed</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((log) => {
              const isFailed = log.status === 'failed';
              return (
                <tr key={log.id} className={clsx('table-row', isFailed && 'bg-rose-500/5')}>
                  <td className="table-cell">
                    <div>
                      <p className="text-sm font-medium text-gray-200">{log.customer.name}</p>
                      <p className="text-xs text-gray-500">{log.customer.email}</p>
                    </div>
                  </td>
                  {PIPELINE_STAGES.map((stage) => {
                    const { reached, timestamp } = getStatusAtStage(log, stage);
                    return <StatusCell key={stage} status={reached ? stage : null} timestamp={timestamp} />;
                  })}
                  <StatusCell
                    status={isFailed ? 'failed' : null}
                    timestamp={(Array.isArray(log.statusHistory) ? log.statusHistory : []).find((h) => h.status === 'failed')?.timestamp}
                  />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {logs.length > 20 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="btn-ghost text-xs w-full justify-center"
        >
          {showAll ? <><ChevronUp className="w-3.5 h-3.5" /> Show fewer</> : <><ChevronDown className="w-3.5 h-3.5" /> Show all {logs.length} messages</>}
        </button>
      )}
    </div>
  );
}

function StatBar({ stats }: { stats: { total: number; delivered: number; failed: number; opened: number; clicked: number; converted: number } }) {
  const { total, delivered, failed, opened, clicked, converted } = stats;
  if (total === 0) return null;

  const segments = [
    { label: 'Converted', value: converted, color: 'bg-violet-500', textColor: 'text-violet-400' },
    { label: 'Clicked', value: clicked - converted, color: 'bg-cyan-500', textColor: 'text-cyan-400' },
    { label: 'Opened', value: opened - clicked, color: 'bg-emerald-500', textColor: 'text-emerald-400' },
    { label: 'Delivered', value: delivered - opened, color: 'bg-blue-500', textColor: 'text-blue-400' },
    { label: 'Failed', value: failed, color: 'bg-rose-500', textColor: 'text-rose-400' },
    { label: 'Pending', value: total - delivered - failed, color: 'bg-gray-600', textColor: 'text-gray-400' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex h-3 rounded-full overflow-hidden gap-px">
        {segments.map((s) => s.value > 0 && (
          <div
            key={s.label}
            className={`${s.color} transition-all duration-700`}
            style={{ width: `${(s.value / total) * 100}%` }}
            title={`${s.label}: ${s.value}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-6 gap-2">
        {[
          { label: 'Total', value: total, textColor: 'text-white' },
          { label: 'Delivered', value: delivered, textColor: 'text-blue-400' },
          { label: 'Opened', value: opened, textColor: 'text-emerald-400' },
          { label: 'Clicked', value: clicked, textColor: 'text-cyan-400' },
          { label: 'Converted', value: converted, textColor: 'text-violet-400' },
          { label: 'Failed', value: failed, textColor: 'text-rose-400' },
        ].map((item) => (
          <div key={item.label} className="text-center">
            <div className={`text-xl font-bold ${item.textColor}`}>{item.value}</div>
            <div className="text-[10px] text-gray-500">{item.label}</div>
            {total > 0 && item.label !== 'Total' && (
              <div className="text-[10px] text-gray-600">
                {Math.round((item.value / total) * 100)}%
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AISummaryCard({ campaignId, hasLogs }: { campaignId: string; hasLogs: boolean }) {
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/performance-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  if (!hasLogs) return null;

  return (
    <div className="ai-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-from" />
          <span className="text-xs font-semibold text-accent-from uppercase tracking-wider">AI Performance Summary</span>
        </div>
        <button onClick={generate} disabled={loading} className="btn-ghost text-xs">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {summary ? 'Regenerate' : 'Generate'}
        </button>
      </div>

      {!summary && !loading && (
        <div className="text-center py-6">
          <Sparkles className="w-8 h-8 mx-auto mb-2 text-gray-600 opacity-50" />
          <p className="text-sm text-gray-400 mb-3">
            AI will analyze your campaign results and suggest improvements.
          </p>
          <button onClick={generate} className="btn-primary text-xs">
            <Sparkles className="w-3.5 h-3.5" /> Generate AI Summary
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 py-4 text-sm text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Analysing campaign performance…
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-rose-300 text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {summary && (
        <div className="space-y-4">
          <div className={clsx(
            'p-3 rounded-lg border',
            summary.sentiment === 'positive' ? 'bg-emerald-500/10 border-emerald-500/20' :
            summary.sentiment === 'negative' ? 'bg-rose-500/10 border-rose-500/20' :
            'bg-blue-500/10 border-blue-500/20',
          )}>
            <p className="text-sm text-gray-200">{summary.summary}</p>
          </div>

          <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <p className="text-xs text-indigo-300 font-medium mb-1">💡 Next campaign suggestion</p>
            <p className="text-sm text-gray-200">{summary.suggestion}</p>
          </div>

          {summary.highlights && (
            <div className="flex flex-wrap gap-2">
              {summary.highlights.map((h, i) => (
                <span key={i} className="badge-indigo">{h}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  const fetchCampaign = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`);
      if (res.ok) {
        const data = await res.json();
        setCampaign(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  // Auto-refresh when delivering
  useEffect(() => {
    if (campaign?.status !== 'delivering') return;
    const interval = setInterval(fetchCampaign, 3000);
    return () => clearInterval(interval);
  }, [campaign?.status, fetchCampaign]);

  const handleSend = async () => {
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/send`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSendSuccess(true);
      setTimeout(() => fetchCampaign(), 500);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-2 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading campaign…
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-8 text-gray-400">Campaign not found.</div>
    );
  }

  const logs = campaign.messageLogs || [];
  const stats = {
    total: logs.length,
    delivered: logs.filter((l) => ['delivered', 'opened', 'clicked', 'converted'].includes(l.status)).length,
    failed: logs.filter((l) => l.status === 'failed').length,
    opened: logs.filter((l) => ['opened', 'clicked', 'converted'].includes(l.status)).length,
    clicked: logs.filter((l) => ['clicked', 'converted'].includes(l.status)).length,
    converted: logs.filter((l) => l.status === 'converted').length,
  };

  const CHANNEL_ICONS: Record<string, string> = { whatsapp: '💬', sms: '📱', email: '📧', rcs: '✨' };

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/campaigns" className="btn-ghost p-2 mt-0.5">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{CHANNEL_ICONS[campaign.channel] || '📨'}</span>
              <h1 className="text-2xl font-bold text-white">{campaign.name}</h1>
              {campaign.status === 'draft' && <span className="badge-gray">Draft</span>}
              {campaign.status === 'delivering' && (
                <span className="badge-amber flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  Delivering
                </span>
              )}
              {campaign.status === 'completed' && <span className="badge-emerald">Completed</span>}
            </div>
            <p className="text-gray-400 text-sm mt-1">
              {campaign.segment.name} · {campaign.channel.toUpperCase()} · {campaign.goal}
            </p>
          </div>
        </div>

        {campaign.status === 'draft' && (
          <div className="space-y-2">
            {!campaign.selectedVariant && (
              <p className="text-xs text-amber-300 text-right">No variant selected yet</p>
            )}
            <button
              onClick={handleSend}
              disabled={sending || !campaign.selectedVariant}
              className="btn-primary"
            >
              {sending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
              ) : (
                <><Send className="w-4 h-4" /> Send Campaign</>
              )}
            </button>
          </div>
        )}

        {campaign.status === 'delivering' && (
          <div className="flex items-center gap-2 text-amber-300 text-sm animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin" />
            Delivering to customers…
          </div>
        )}
      </div>

      {sendError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          <AlertCircle className="w-4 h-4" /> {sendError}
        </div>
      )}
      {sendSuccess && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
          <Check className="w-4 h-4" /> Campaign sent! Delivery pipeline will update automatically.
        </div>
      )}

      {/* Selected message preview */}
      {campaign.selectedVariant && (
        <div className="card p-5">
          <p className="text-xs text-gray-500 mb-2">Campaign Message</p>
          {campaign.selectedVariant.subject && (
            <p className="text-sm font-medium text-gray-300 mb-1">Subject: {campaign.selectedVariant.subject}</p>
          )}
          <p className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
            {campaign.selectedVariant.content}
          </p>
        </div>
      )}

      {/* Delivery stats */}
      {logs.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Delivery Stats</h2>
            {campaign.status === 'delivering' && (
              <button onClick={fetchCampaign} className="btn-ghost text-xs">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            )}
          </div>
          <StatBar stats={stats} />
        </div>
      )}

      {/* Delivery Pipeline */}
      {logs.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-white">Delivery Pipeline</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Real-time status per customer · {campaign.status === 'delivering' ? 'Auto-refreshing every 3s' : `${logs.length} messages`}
              </p>
            </div>
            {campaign.status === 'delivering' && (
              <span className="flex items-center gap-1.5 text-xs text-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Live
              </span>
            )}
          </div>
          <PipelineTable logs={logs} />
        </div>
      )}

      {/* AI Performance Summary */}
      <AISummaryCard campaignId={campaignId} hasLogs={logs.length > 0} />
    </div>
  );
}
