'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Sparkles, Plus, Trash2, Save, Users, ChevronDown,
  RefreshCw, X, Check, AlertCircle, Loader2, Target
} from 'lucide-react';
import {
  FilterGroup, FilterCondition, FilterableField, FilterOperator,
  FILTERABLE_FIELDS, OPERATORS, FIELD_LABELS, OPERATOR_LABELS, isFilterGroup
} from '@/lib/filter-schema';
import clsx from 'clsx';

type Condition = FilterCondition | FilterGroup;

const FIELD_TYPE: Record<FilterableField, 'number' | 'date' | 'string' | 'tag'> = {
  totalSpend: 'number',
  lastOrderDate: 'date',
  daysSinceLastOrder: 'number',
  tags: 'tag',
  orderCount: 'number',
  name: 'string',
  email: 'string',
};

const OPERATORS_FOR_TYPE: Record<string, FilterOperator[]> = {
  number: ['gte', 'lte', 'gt', 'lt', 'eq', 'between'],
  date: ['gte', 'lte', 'gt', 'lt', 'eq'],
  string: ['contains', 'eq', 'not_contains'],
  tag: ['contains', 'not_contains', 'in'],
};

const TAG_SUGGESTIONS = ['vip', 'frequent', 'new', 'churned', 'high-value', 'loyal', 'seasonal', 'premium', 'bargain-hunter'];

function FilterRow({
  condition,
  index,
  onChange,
  onRemove,
}: {
  condition: FilterCondition;
  index: number;
  onChange: (c: FilterCondition) => void;
  onRemove: () => void;
}) {
  const fieldType = FIELD_TYPE[condition.field] || 'string';
  const availableOps = OPERATORS_FOR_TYPE[fieldType] || OPERATORS;

  return (
    <div className="flex items-center gap-2 p-3 bg-navy-800/50 rounded-lg border border-surface-border/50 group animate-slide-up">
      <div className="flex-1 flex items-center gap-2 flex-wrap">
        {/* Field selector */}
        <select
          value={condition.field}
          onChange={(e) => onChange({ ...condition, field: e.target.value as FilterableField, value: undefined })}
          className="select text-xs py-1.5 px-2 w-auto"
        >
          {FILTERABLE_FIELDS.map((f) => (
            <option key={f} value={f}>{FIELD_LABELS[f]}</option>
          ))}
        </select>

        {/* Operator selector */}
        <select
          value={condition.op}
          onChange={(e) => onChange({ ...condition, op: e.target.value as FilterOperator })}
          className="select text-xs py-1.5 px-2 w-auto"
        >
          {availableOps.map((op) => (
            <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
          ))}
        </select>

        {/* Value input */}
        {condition.op !== 'is_null' && condition.op !== 'is_not_null' && (
          <>
            {fieldType === 'tag' ? (
              <div className="flex items-center gap-1 flex-wrap">
                <input
                  type="text"
                  value={Array.isArray(condition.value) ? (condition.value as string[]).join(', ') : (condition.value as string || '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (condition.op === 'in') {
                      onChange({ ...condition, value: val.split(',').map((s) => s.trim()).filter(Boolean) });
                    } else {
                      onChange({ ...condition, value: val });
                    }
                  }}
                  placeholder={condition.op === 'in' ? 'vip, loyal, ...' : 'tag name'}
                  className="input text-xs py-1.5 w-36"
                />
                <div className="flex flex-wrap gap-1">
                  {TAG_SUGGESTIONS.slice(0, 3).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => onChange({ ...condition, value: tag })}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            ) : condition.op === 'between' ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={(condition.value as number[])?.[0] ?? ''}
                  onChange={(e) => {
                    const arr = Array.isArray(condition.value) ? [...(condition.value as number[])] : [0, 0];
                    arr[0] = parseFloat(e.target.value);
                    onChange({ ...condition, value: arr });
                  }}
                  placeholder="Min"
                  className="input text-xs py-1.5 w-24"
                />
                <span className="text-gray-500 text-xs">to</span>
                <input
                  type="number"
                  value={(condition.value as number[])?.[1] ?? ''}
                  onChange={(e) => {
                    const arr = Array.isArray(condition.value) ? [...(condition.value as number[])] : [0, 0];
                    arr[1] = parseFloat(e.target.value);
                    onChange({ ...condition, value: arr });
                  }}
                  placeholder="Max"
                  className="input text-xs py-1.5 w-24"
                />
              </div>
            ) : fieldType === 'date' ? (
              <input
                type="date"
                value={condition.value as string || ''}
                onChange={(e) => onChange({ ...condition, value: e.target.value })}
                className="input text-xs py-1.5 w-auto"
              />
            ) : (
              <input
                type={fieldType === 'number' ? 'number' : 'text'}
                value={condition.value as string | number || ''}
                onChange={(e) => onChange({
                  ...condition,
                  value: fieldType === 'number' ? parseFloat(e.target.value) : e.target.value,
                })}
                placeholder={fieldType === 'number' ? '0' : 'value'}
                className="input text-xs py-1.5 w-32"
              />
            )}
          </>
        )}
      </div>

      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 transition-all"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function FilterBuilder({
  group,
  onChange,
}: {
  group: FilterGroup;
  onChange: (g: FilterGroup) => void;
}) {
  const addCondition = () => {
    onChange({
      ...group,
      conditions: [
        ...group.conditions,
        { field: 'totalSpend', op: 'gte', value: 1000 },
      ],
    });
  };

  const updateCondition = (index: number, updated: Condition) => {
    const newConditions = [...group.conditions];
    newConditions[index] = updated;
    onChange({ ...group, conditions: newConditions });
  };

  const removeCondition = (index: number) => {
    onChange({ ...group, conditions: group.conditions.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-2">
      {/* Operator toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Match</span>
        <div className="flex rounded-lg overflow-hidden border border-surface-border">
          {(['AND', 'OR'] as const).map((op) => (
            <button
              key={op}
              onClick={() => onChange({ ...group, operator: op })}
              className={clsx(
                'px-3 py-1 text-xs font-medium transition-all',
                group.operator === op
                  ? 'bg-accent text-white'
                  : 'bg-surface-raised text-gray-400 hover:text-gray-200',
              )}
            >
              {op}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500">of the following conditions:</span>
      </div>

      {/* Conditions list */}
      <div className="space-y-2">
        {group.conditions.map((condition, index) => (
          isFilterGroup(condition) ? null : (
            <FilterRow
              key={index}
              condition={condition as FilterCondition}
              index={index}
              onChange={(updated) => updateCondition(index, updated)}
              onRemove={() => removeCondition(index)}
            />
          )
        ))}
      </div>

      {/* Add condition */}
      <button
        onClick={addCondition}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-400 transition-colors py-1 px-2 rounded hover:bg-indigo-500/10"
      >
        <Plus className="w-3.5 h-3.5" />
        Add condition
      </button>
    </div>
  );
}

function PreviewTable({ customers }: { customers: Array<{ id: string; name: string; email: string; totalSpend: number; lastOrderDate: string | null; tags: string[] }> }) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {['Name', 'Email', 'Total Spend', 'Last Order', 'Tags'].map((h) => (
              <th key={h} className="table-header text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id} className="table-row">
              <td className="table-cell font-medium text-gray-200">{c.name}</td>
              <td className="table-cell text-gray-400">{c.email}</td>
              <td className="table-cell text-emerald-400">₹{c.totalSpend.toLocaleString()}</td>
              <td className="table-cell text-gray-400">
                {c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : '—'}
              </td>
              <td className="table-cell">
                <div className="flex flex-wrap gap-1">
                  {c.tags.map((tag) => (
                    <span key={tag} className="badge-indigo text-[10px] px-1.5 py-0.5">{tag}</span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AudiencePage() {
  const [nlInput, setNlInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterGroup, setFilterGroup] = useState<FilterGroup | null>(null);
  const [aiDescription, setAiDescription] = useState('');
  const [preview, setPreview] = useState<{ count: number; customers: unknown[] } | null>(null);

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [savedSegments, setSavedSegments] = useState<Array<{ id: string; name: string; description?: string; createdAt: string; _count: { campaigns: number } }>>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deletingSegmentId, setDeletingSegmentId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Load saved segments
  const loadSegments = useCallback(async () => {
    const res = await fetch('/api/segments');
    if (res.ok) {
      const data = await res.json();
      setSavedSegments(data);
    }
  }, []);

  useEffect(() => { loadSegments(); }, [loadSegments]);

  // Delete segment
  const handleDeleteSegment = async (segId: string, segName: string) => {
    if (!confirm(`Delete segment "${segName}"? This cannot be undone.`)) return;
    setDeletingSegmentId(segId);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/segments/${segId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      await loadSegments();
      if (filterGroup) setFilterGroup(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingSegmentId(null);
    }
  };

  // Generate filter from NL
  const handleGenerate = async () => {
    if (!nlInput.trim()) return;
    setIsGenerating(true);
    setError(null);
    setPreview(null);

    try {
      const res = await fetch('/api/ai/segment-filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ naturalLanguage: nlInput }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to generate filter');

      setFilterGroup(data.filterJson);
      setAiDescription(data.description || nlInput);
      setSaveName(data.description || nlInput);

      // Auto-preview
      await handlePreview(data.filterJson);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  // Preview segment
  const handlePreview = async (fg?: FilterGroup) => {
    const group = fg || filterGroup;
    if (!group) return;
    setIsPreviewing(true);
    setError(null);

    try {
      const res = await fetch('/api/segments/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filterJson: group }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Preview failed');
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setIsPreviewing(false);
    }
  };

  // Save segment
  const handleSave = async () => {
    if (!filterGroup || !saveName.trim()) return;
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: saveName, description: aiDescription, filterJson: filterGroup }),
      });
      if (!res.ok) throw new Error('Failed to save segment');

      setSaveDialogOpen(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadSegments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const examplePrompts = [
    'Customers who spent over ₹10,000 in the last 3 months',
    'VIP customers who haven\'t ordered in 60 days',
    'New customers with 1-2 orders tagged as frequent',
    'High value customers with at least 5 orders',
  ];

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Audience Builder</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Describe your audience in plain English — AI builds the filters.
          </p>
        </div>
        {saveSuccess && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm animate-slide-in-right">
            <Check className="w-4 h-4" />
            Segment saved!
          </div>
        )}
      </div>

      {/* AI Input */}
      <div className="ai-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-accent-from" />
          <span className="text-xs font-semibold text-accent-from uppercase tracking-wider">AI Segment Builder</span>
          <span className="badge-indigo ml-auto">Powered by Gemini</span>
        </div>

        <div className="flex gap-3">
          <textarea
            value={nlInput}
            onChange={(e) => setNlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); }
            }}
            placeholder="e.g. Customers who spent over ₹5000 in the last 3 months and haven't ordered recently..."
            className="textarea flex-1 min-h-[72px] text-sm"
            rows={3}
          />
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !nlInput.trim()}
            className="btn-primary self-start"
          >
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Thinking...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Generate</>
            )}
          </button>
        </div>

        {/* Example prompts */}
        <div className="flex flex-wrap gap-2 mt-3">
          {examplePrompts.map((p) => (
            <button
              key={p}
              onClick={() => setNlInput(p)}
              className="text-xs px-2 py-1 rounded-md bg-surface-raised border border-surface-border text-gray-400 hover:text-gray-200 hover:border-accent/30 transition-all"
            >
              {p.length > 40 ? p.slice(0, 40) + '…' : p}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Filter Builder (shown after AI generation) */}
      {filterGroup && (
        <div className="card p-6 space-y-4 animate-slide-up">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Generated Filters</h2>
              {aiDescription && (
                <p className="text-xs text-gray-400 mt-0.5">{aiDescription}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePreview()}
                disabled={isPreviewing}
                className="btn-secondary text-xs"
              >
                {isPreviewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Preview
              </button>
              <button
                onClick={() => setSaveDialogOpen(true)}
                className="btn-primary text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                Save Segment
              </button>
            </div>
          </div>

          <FilterBuilder group={filterGroup} onChange={(g) => { setFilterGroup(g); setPreview(null); }} />
        </div>
      )}

      {/* Preview results */}
      {preview && (
        <div className="card p-6 space-y-4 animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              <span className="text-lg font-bold text-white">{preview.count.toLocaleString()}</span>
              <span className="text-gray-400 text-sm">customers match</span>
            </div>
            {preview.count > 0 && (
              <span className="badge-emerald">Ready to target</span>
            )}
          </div>

          {(preview.customers as unknown[]).length > 0 && (
            <>
              <p className="text-xs text-gray-500">Showing first 10 customers</p>
              <PreviewTable customers={preview.customers as Array<{ id: string; name: string; email: string; totalSpend: number; lastOrderDate: string | null; tags: string[] }>} />
            </>
          )}
        </div>
      )}

      {/* Save dialog */}
      {saveDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="card p-6 w-full max-w-md space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Save Segment</h3>
              <button onClick={() => setSaveDialogOpen(false)} className="btn-ghost p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Segment name</label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="input"
                  placeholder="e.g. High Value Win-Back"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <textarea
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                  className="textarea text-sm"
                  rows={2}
                />
              </div>
              {preview && (
                <p className="text-xs text-gray-500">
                  This segment will target <strong className="text-white">{preview.count}</strong> customers.
                </p>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setSaveDialogOpen(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={isSaving || !saveName.trim()} className="btn-primary">
                {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Check className="w-4 h-4" /> Save Segment</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved segments */}
      {savedSegments.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Saved Segments</h2>
            <span className="badge-gray">{savedSegments.length} saved</span>
          </div>
          {deleteError && (
            <div className="flex items-center gap-2 p-2 mb-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {deleteError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {savedSegments.map((seg) => (
              <div
                key={seg.id}
                className="p-4 rounded-lg border border-surface-border bg-surface-raised/50 hover:border-accent/30 transition-all cursor-pointer group relative"
                onClick={() => {
                  const fg = (seg as unknown as { filterJson: FilterGroup }).filterJson;
                  setFilterGroup(fg);
                  setAiDescription(seg.description || seg.name);
                  setSaveName(seg.name);
                  handlePreview(fg);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-200 group-hover:text-white truncate">{seg.name}</p>
                    {seg.description && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{seg.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    <span className="badge-gray">{seg._count.campaigns} campaigns</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteSegment(seg.id, seg.name); }}
                      disabled={deletingSegmentId === seg.id}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 transition-all"
                      title="Delete segment"
                    >
                      {deletingSegmentId === seg.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-gray-600 mt-2">
                  {new Date(seg.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
