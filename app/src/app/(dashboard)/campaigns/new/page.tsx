'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles, ChevronRight, ChevronLeft, Loader2, Check,
  MessageSquare, Mail, Phone, Zap, Edit3, AlertCircle, Info, Users
} from 'lucide-react';
import clsx from 'clsx';

type Step = 1 | 2 | 3 | 4;

type Segment = { id: string; name: string; description?: string; audienceSize?: number | null };
type Variant = { id: string; subject?: string | null; content: string; preview: string; tone: string };
type ChannelSuggestion = {
  suggestedChannel: string;
  rationale: string;
  reasoning?: string;
  confidence: string;
  stats?: Record<string, { openRate: number; clickRate: number }>;
  _mock?: boolean;
};

const CHANNELS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬', desc: 'Conversational, high open rate' },
  { id: 'sms', label: 'SMS', icon: '📱', desc: '160 char limit, no subject' },
  { id: 'email', label: 'Email', icon: '📧', desc: 'Subject + body, rich content' },
  { id: 'rcs', label: 'RCS', icon: '✨', desc: 'Rich cards + buttons' },
];

const GOALS = [
  { id: 'win-back', label: 'Win-Back', desc: 'Re-engage lapsed customers' },
  { id: 'upsell', label: 'Upsell', desc: 'Encourage premium purchases' },
  { id: 'new-arrival', label: 'New Arrival', desc: 'Announce new products' },
  { id: 'retention', label: 'Retention', desc: 'Reward loyal customers' },
  { id: 'promotional', label: 'Promotional', desc: 'Time-limited offer' },
];

const TONE_COLORS: Record<string, string> = {
  warm: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  urgent: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  formal: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  casual: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

function StepIndicator({ current, total }: { current: Step; total: number }) {
  const labels = ['Select Audience', 'Choose Channel', 'Generate Copy', 'Review & Save'];
  return (
    <div className="flex items-center gap-0">
      {labels.map((label, i) => {
        const step = (i + 1) as Step;
        const isActive = step === current;
        const isDone = step < current;
        return (
          <div key={step} className="flex items-center">
            <div className={clsx(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs font-medium',
              isActive && 'bg-accent/20 text-accent-from border border-accent/30',
              isDone && 'text-emerald-400',
              !isActive && !isDone && 'text-gray-500',
            )}>
              <div className={clsx(
                'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                isActive && 'bg-accent text-white',
                isDone && 'bg-emerald-500 text-white',
                !isActive && !isDone && 'bg-surface-raised text-gray-500',
              )}>
                {isDone ? <Check className="w-3 h-3" /> : step}
              </div>
              {label}
            </div>
            {i < total - 1 && (
              <ChevronRight className="w-3.5 h-3.5 text-gray-600 mx-1" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState('');
  const [segmentAudience, setSegmentAudience] = useState<Record<string, number>>({});

  // Step 2
  const [selectedChannel, setSelectedChannel] = useState('');
  const [selectedGoal, setSelectedGoal] = useState('');
  const [channelSuggestion, setChannelSuggestion] = useState<ChannelSuggestion | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  // Step 3
  const [variants, setVariants] = useState<Variant[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [editedVariants, setEditedVariants] = useState<Record<string, string>>({});

  // Step 4
  const [campaignName, setCampaignName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/segments')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSegments(data);
          // Fetch audience count for each segment
          data.forEach((seg: Segment & { audienceSize?: number }) => {
            if (seg.audienceSize !== undefined) {
              setSegmentAudience((prev) => ({ ...prev, [seg.id]: seg.audienceSize! }));
            }
          });
        }
      })
      .catch(() => {});
  }, []);

  const selectedSegment = segments.find((s) => s.id === selectedSegmentId);

  // Get channel suggestion when segment selected
  const fetchChannelSuggestion = async (segId: string) => {
    setLoadingSuggestion(true);
    try {
      const res = await fetch('/api/ai/channel-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentId: segId }),
      });
      if (res.ok) {
        const data = await res.json();
        setChannelSuggestion(data);
        if (!selectedChannel) setSelectedChannel(data.suggestedChannel);
      }
    } catch {
      // ignore
    } finally {
      setLoadingSuggestion(false);
    }
  };

  const handleStep1Next = () => {
    if (!selectedSegmentId) return;
    setStep(2);
    fetchChannelSuggestion(selectedSegmentId);
  };

  const handleGenerateCopy = async () => {
    if (!selectedSegmentId || !selectedGoal || !selectedChannel) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/campaign-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segmentId: selectedSegmentId,
          goal: selectedGoal,
          channel: selectedChannel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setVariants(data.variants || []);
      if (data.variants?.[0]) setSelectedVariantId(data.variants[0].id);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate copy');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveCampaign = async () => {
    if (!campaignName.trim() || !selectedVariantId) return;
    setIsSaving(true);
    setError(null);
    try {
      const selectedVariant = variants.find((v) => v.id === selectedVariantId);
      const finalContent = editedVariants[selectedVariantId] ?? selectedVariant?.content ?? '';
      const finalVariant = { ...selectedVariant, content: finalContent };

      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          segmentId: selectedSegmentId,
          channel: selectedChannel,
          goal: selectedGoal,
          messageVariants: variants,
          selectedVariant: finalVariant,
          channelSuggestion: channelSuggestion,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/campaigns/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save campaign');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">New Campaign</h1>
        <p className="text-gray-400 mt-1 text-sm">AI generates message variants — you pick and edit before sending.</p>
      </div>

      {/* Step indicator */}
      <StepIndicator current={step} total={4} />

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ─── Step 1: Select Segment ─────────────── */}
      {step === 1 && (
        <div className="card p-6 space-y-4 animate-slide-up">
          <h2 className="text-base font-semibold text-white">Choose your audience segment</h2>
          {segments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No segments yet. Create one on the Audience page first.</p>
              <a href="/audience" className="btn-primary mt-3 inline-flex text-xs">Go to Audience Builder</a>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {segments.map((seg) => (
                <button
                  key={seg.id}
                  onClick={() => setSelectedSegmentId(seg.id)}
                  className={clsx(
                    'p-4 rounded-lg border text-left transition-all',
                    selectedSegmentId === seg.id
                      ? 'border-accent/60 bg-accent/10 shadow-glow'
                      : 'border-surface-border bg-surface-raised/50 hover:border-accent/30',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-200">{seg.name}</p>
                    {selectedSegmentId === seg.id && (
                      <Check className="w-4 h-4 text-accent-from" />
                    )}
                  </div>
                  {seg.description && (
                    <p className="text-xs text-gray-500 mt-1">{seg.description}</p>
                  )}
                  {seg.audienceSize != null && (
                    <div className="flex items-center gap-1 mt-2">
                      <Users className="w-3 h-3 text-indigo-400" />
                      <span className="text-[10px] text-indigo-300 font-medium">
                        {seg.audienceSize.toLocaleString()} customers
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
          <div className="flex justify-end">
            <button
              onClick={handleStep1Next}
              disabled={!selectedSegmentId}
              className="btn-primary"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 2: Channel + Goal ──────────────── */}
      {step === 2 && (
        <div className="space-y-4 animate-slide-up">
          {/* AI Channel Suggestion */}
          {(loadingSuggestion || channelSuggestion) && (
            <div className="ai-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent-from" />
                  <span className="text-xs font-semibold text-accent-from uppercase tracking-wider">AI Channel Recommendation</span>
                </div>
                {channelSuggestion && (
                  <span className={clsx(
                    'badge border text-xs',
                    channelSuggestion.confidence === 'high' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                    channelSuggestion.confidence === 'medium' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                    'text-gray-400 bg-gray-500/10 border-gray-500/20'
                  )}>
                    {channelSuggestion.confidence} confidence{channelSuggestion._mock ? ' · demo' : ''}
                  </span>
                )}
              </div>

              {loadingSuggestion ? (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" /> Analysing segment engagement history…
                </div>
              ) : channelSuggestion && (
                <div className="space-y-4">
                  {/* Channel comparison table */}
                  {channelSuggestion.stats && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-surface-border">
                            <th className="text-left py-2 px-3 text-gray-500 font-medium">Channel</th>
                            <th className="text-center py-2 px-3 text-gray-500 font-medium">Open Rate</th>
                            <th className="text-center py-2 px-3 text-gray-500 font-medium">Click Rate</th>
                            <th className="text-center py-2 px-3 text-gray-500 font-medium">Signal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {CHANNELS.map((ch) => {
                            const stat = channelSuggestion.stats?.[ch.id];
                            const isWinner = ch.id === channelSuggestion.suggestedChannel;
                            const openRate = stat?.openRate ?? 0;
                            const clickRate = stat?.clickRate ?? 0;
                            const signal = openRate + clickRate;
                            return (
                              <tr
                                key={ch.id}
                                className={clsx(
                                  'border-b border-surface-border/30 transition-colors',
                                  isWinner ? 'bg-accent/10' : 'hover:bg-surface-raised/30',
                                )}
                              >
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-2">
                                    <span>{ch.icon}</span>
                                    <span className={clsx('font-medium', isWinner ? 'text-white' : 'text-gray-400')}>
                                      {ch.label}
                                    </span>
                                    {isWinner && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/30 text-accent-from font-semibold">
                                        AI Pick ✓
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <div className="w-16 h-1.5 bg-surface-raised rounded-full overflow-hidden">
                                      <div
                                        className={clsx('h-full rounded-full', isWinner ? 'bg-accent-from' : 'bg-gray-600')}
                                        style={{ width: `${Math.min(openRate, 100)}%` }}
                                      />
                                    </div>
                                    <span className={clsx(isWinner ? 'text-white font-semibold' : 'text-gray-400')}>
                                      {openRate}%
                                    </span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <div className="w-16 h-1.5 bg-surface-raised rounded-full overflow-hidden">
                                      <div
                                        className={clsx('h-full rounded-full', isWinner ? 'bg-cyan-500' : 'bg-gray-600')}
                                        style={{ width: `${Math.min(clickRate, 100)}%` }}
                                      />
                                    </div>
                                    <span className={clsx(isWinner ? 'text-white font-semibold' : 'text-gray-400')}>
                                      {clickRate}%
                                    </span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className={clsx(
                                    'font-semibold',
                                    isWinner ? 'text-accent-from' : 'text-gray-500',
                                  )}>
                                    {signal}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Reasoning paragraph */}
                  {(channelSuggestion.reasoning || channelSuggestion.rationale) && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-raised/50 border border-surface-border/50">
                      <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-300 leading-relaxed">
                        {channelSuggestion.reasoning || channelSuggestion.rationale}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="card p-6 space-y-5">
            {/* Channel selection */}
            <div>
              <h2 className="text-sm font-semibold text-white mb-3">Select channel</h2>
              <div className="grid grid-cols-4 gap-3">
                {CHANNELS.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => setSelectedChannel(ch.id)}
                    className={clsx(
                      'p-3 rounded-lg border text-center transition-all',
                      selectedChannel === ch.id
                        ? 'border-accent/60 bg-accent/10'
                        : 'border-surface-border bg-surface-raised/50 hover:border-accent/30',
                    )}
                  >
                    <div className="text-2xl mb-1">{ch.icon}</div>
                    <div className="text-xs font-medium text-gray-200">{ch.label}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{ch.desc}</div>
                    {channelSuggestion?.suggestedChannel === ch.id && (
                      <div className="mt-1 text-[10px] text-accent-from font-medium">AI Pick ✓</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Goal selection */}
            <div>
              <h2 className="text-sm font-semibold text-white mb-3">Campaign goal</h2>
              <div className="grid grid-cols-3 gap-2">
                {GOALS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGoal(g.id)}
                    className={clsx(
                      'p-3 rounded-lg border text-left transition-all',
                      selectedGoal === g.id
                        ? 'border-accent/60 bg-accent/10'
                        : 'border-surface-border bg-surface-raised/50 hover:border-accent/30',
                    )}
                  >
                    <div className="text-xs font-medium text-gray-200">{g.label}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{g.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setStep(1)} className="btn-secondary">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleGenerateCopy}
                disabled={!selectedChannel || !selectedGoal || isGenerating}
                className="btn-primary"
              >
                {isGenerating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating variants…</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Generate Copy</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Step 3: Pick Variant ────────────────── */}
      {step === 3 && (
        <div className="space-y-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Choose a message variant</h2>
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                AI generated 3 variants — pick one and edit inline
              </p>
            </div>
            <button onClick={() => setStep(2)} className="btn-ghost text-xs">
              <ChevronLeft className="w-3.5 h-3.5" /> Change settings
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {variants.map((variant) => {
              const isSelected = selectedVariantId === variant.id;
              const editedContent = editedVariants[variant.id] ?? variant.content;
              return (
                <div
                  key={variant.id}
                  onClick={() => setSelectedVariantId(variant.id)}
                  className={clsx(
                    'card p-4 cursor-pointer transition-all space-y-3',
                    isSelected ? 'border-accent/60 bg-accent/5 shadow-glow' : 'hover:border-accent/30',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={clsx('badge border', TONE_COLORS[variant.tone] || 'badge-gray')}>
                      {variant.tone}
                    </span>
                    {isSelected && (
                      <span className="badge-emerald flex items-center gap-1">
                        <Check className="w-3 h-3" /> Selected
                      </span>
                    )}
                  </div>

                  {variant.subject && (
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Subject</p>
                      <p className="text-xs font-medium text-gray-200">{variant.subject}</p>
                    </div>
                  )}

                  <div>
                    {variant.subject && (
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Body</p>
                    )}
                    <textarea
                      value={editedContent}
                      onChange={(e) => {
                        e.stopPropagation();
                        setEditedVariants((prev) => ({ ...prev, [variant.id]: e.target.value }));
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-navy-800/50 border border-surface-border/50 rounded-lg p-2 text-xs text-gray-300 resize-none focus:outline-none focus:border-accent/40 font-mono"
                      rows={selectedChannel === 'sms' ? 4 : 8}
                    />
                    {selectedChannel === 'sms' && (
                      <p className={clsx('text-[10px] mt-1', editedContent.length > 160 ? 'text-rose-400' : 'text-gray-500')}>
                        {editedContent.length}/160 chars
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-gray-600">
                    <Edit3 className="w-3 h-3" />
                    Click content to edit
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep(4)}
              disabled={!selectedVariantId}
              className="btn-primary"
            >
              Proceed to Review <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 4: Name + Save ─────────────────── */}
      {step === 4 && (
        <div className="card p-6 space-y-5 animate-slide-up">
          <h2 className="text-base font-semibold text-white">Review & save campaign</h2>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Segment', value: selectedSegment?.name || '—' },
              { label: 'Channel', value: CHANNELS.find((c) => c.id === selectedChannel)?.label || selectedChannel },
              { label: 'Goal', value: GOALS.find((g) => g.id === selectedGoal)?.label || selectedGoal },
            ].map((item) => (
              <div key={item.label} className="bg-surface-raised rounded-lg p-3">
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className="text-sm font-medium text-gray-200 mt-1">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Selected variant preview */}
          {variants.find((v) => v.id === selectedVariantId) && (() => {
            const v = variants.find((v) => v.id === selectedVariantId)!;
            const content = editedVariants[v.id] ?? v.content;
            return (
              <div className="bg-navy-800/50 rounded-lg p-4 border border-surface-border/50">
                <p className="text-xs text-gray-500 mb-2">Selected message ({v.tone} tone)</p>
                {v.subject && <p className="text-xs font-semibold text-gray-300 mb-2">Subject: {v.subject}</p>}
                <p className="text-sm text-gray-300 whitespace-pre-wrap font-mono">{content}</p>
              </div>
            );
          })()}

          {/* Campaign name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Campaign name</label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder={`${GOALS.find((g) => g.id === selectedGoal)?.label} — ${selectedSegment?.name || 'Campaign'}`}
              className="input"
              autoFocus
            />
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300">
              Saving as <strong>Draft</strong>. You'll be able to review and send from the campaign detail page.
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <button onClick={() => setStep(3)} className="btn-secondary">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={handleSaveCampaign}
              disabled={isSaving || !campaignName.trim()}
              className="btn-primary"
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              ) : (
                <><Check className="w-4 h-4" /> Save Campaign</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
