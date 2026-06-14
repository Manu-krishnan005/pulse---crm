'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Upload, Search, X, ChevronLeft, ChevronRight,
  AlertCircle, Check, Loader2, TrendingUp, ShoppingBag,
  FileUp, Download
} from 'lucide-react';
import Papa from 'papaparse';
import clsx from 'clsx';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  totalSpend: number;
  lastOrderDate: string | null;
  tags: string[];
  _count: { orders: number };
}

const SAMPLE_CSV = `name,email,phone,total_spend,last_order_date,tags
Priya Sharma,priya.sharma@example.com,+91-9876543210,15000,2024-10-15,vip;loyal
Rahul Mehta,rahul.mehta@example.com,+91-9988776655,8500,2024-11-20,frequent
Aarav Patel,aarav.patel@example.com,+91-9765432109,3200,2024-09-05,new
Sneha Gupta,sneha.gupta@example.com,,22000,2024-12-01,vip;high-value
Kiran Nair,kiran.nair@example.com,+91-9654321098,650,2024-08-20,churned`;

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // CSV upload state
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success?: boolean; message?: string; created?: number; skipped?: number; errors?: number;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const LIMIT = 20;

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/customers?page=${page}&limit=${LIMIT}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
        setTotal(data.total || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleFileChange = async (file: File) => {
    setUploadError(null);
    setUploadResult(null);

    const text = await file.text();
    await uploadCSV(text);
  };

  const uploadCSV = async (csvText: string) => {
    setUploading(true);
    try {
      const res = await fetch('/api/customers/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData: csvText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setUploadResult(data);
      fetchCustomers();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pulse-customers-sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(total / LIMIT);
  const avgSpend = customers.length > 0
    ? Math.round(customers.reduce((s, c) => s + c.totalSpend, 0) / customers.length)
    : 0;

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <p className="text-gray-400 mt-1 text-sm">
            {total.toLocaleString()} customers total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="btn-secondary"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Customers', value: total.toLocaleString(), icon: Users, color: 'from-indigo-500 to-violet-500' },
          { label: 'Avg. Spend', value: `₹${avgSpend.toLocaleString()}`, icon: TrendingUp, color: 'from-emerald-500 to-teal-500' },
          { label: 'Customers on Page', value: customers.length.toString(), icon: ShoppingBag, color: 'from-cyan-500 to-blue-500' },
        ].map((s) => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* CSV Upload Panel */}
      {showUpload && (
        <div className="card p-6 space-y-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Import Customers via CSV</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Required columns: <code className="text-indigo-300">name</code>, <code className="text-indigo-300">email</code>. Optional: phone, total_spend, last_order_date, tags
              </p>
            </div>
            <button onClick={downloadSample} className="btn-ghost text-xs">
              <Download className="w-3.5 h-3.5" />
              Download sample CSV
            </button>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFileChange(file);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={clsx(
              'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
              isDragging
                ? 'border-accent bg-accent/10'
                : 'border-surface-border hover:border-accent/40 hover:bg-surface-raised/30',
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileChange(file);
              }}
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-accent-from" />
                <span className="text-sm">Uploading…</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <FileUp className="w-8 h-8 text-gray-500" />
                <p className="text-sm text-gray-300 font-medium">Drag & drop CSV here, or click to select</p>
                <p className="text-xs text-gray-500">Supports .csv files up to 10MB</p>
              </div>
            )}
          </div>

          {uploadResult && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm animate-slide-up">
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{uploadResult.message}</p>
                <p className="text-xs text-emerald-400/70 mt-0.5">
                  {uploadResult.created} imported · {uploadResult.skipped} skipped (duplicates) · {uploadResult.errors} errors
                </p>
              </div>
            </div>
          )}

          {uploadError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {uploadError}
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name or email…"
          className="input pl-9"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading customers…
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-600 opacity-50" />
            <h3 className="text-lg font-medium text-gray-300">No customers yet</h3>
            <p className="text-gray-500 text-sm mt-1">Import a CSV or run the seed script to add customers.</p>
            <button onClick={() => setShowUpload(true)} className="btn-primary mt-4 inline-flex">
              <Upload className="w-4 h-4" /> Import CSV
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Name', 'Email', 'Phone', 'Total Spend', 'Orders', 'Last Order', 'Tags'].map((h) => (
                    <th key={h} className="table-header text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="table-row">
                    <td className="table-cell font-medium text-gray-200">{c.name}</td>
                    <td className="table-cell text-gray-400 text-sm">{c.email}</td>
                    <td className="table-cell text-gray-500 text-sm">{c.phone || '—'}</td>
                    <td className="table-cell">
                      <span className="text-emerald-400 font-medium">₹{c.totalSpend.toLocaleString()}</span>
                    </td>
                    <td className="table-cell text-center">
                      <span className="badge-gray">{c._count.orders}</span>
                    </td>
                    <td className="table-cell text-gray-400 text-sm">
                      {c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-wrap gap-1">
                        {c.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="badge-indigo text-[10px] px-1.5 py-0.5">{tag}</span>
                        ))}
                        {c.tags.length > 3 && (
                          <span className="badge-gray text-[10px] px-1.5 py-0.5">+{c.tags.length - 3}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border">
            <p className="text-xs text-gray-500">
              Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} of {total.toLocaleString()}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-ghost p-1.5 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-ghost p-1.5 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
