import React, { useState, useEffect } from 'react';
import { WebhookEventRecord, ReviewResult } from '../types';
import { History, RefreshCw, GitPullRequest, ShieldCheck, AlertTriangle, ArrowRight, Play, Terminal } from 'lucide-react';

interface AuditLogTabProps {
  onLoadReview: (result: ReviewResult) => void;
}

export const AuditLogTab: React.FC<AuditLogTabProps> = ({ onLoadReview }) => {
  const [records, setRecords] = useState<WebhookEventRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reRunningId, setReRunningId] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchAuditLog = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/audit-log');
      if (res.ok) {
        const data = await res.json() as { records: WebhookEventRecord[] };
        setRecords(data.records || []);
      } else {
        throw new Error(`Failed to load audit log (HTTP ${res.status})`);
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching audit records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLog();
  }, []);

  const handleReReview = async (record: WebhookEventRecord) => {
    if (!record.repo || !record.pullNumber) return;
    setReRunningId(record.id);
    setError(null);
    try {
      const res = await fetch(`/api/audit-log/${record.id}/re-review`, {
        method: 'POST'
      });
      if (!res.ok) {
        const errData = await res.json() as { error?: string };
        throw new Error(errData.error || 'Re-review failed');
      }
      const newReview = await res.json() as ReviewResult;
      onLoadReview(newReview);
      await fetchAuditLog();
    } catch (err: any) {
      setError(err.message || 'Failed to trigger re-review');
    } finally {
      setReRunningId(null);
    }
  };

  const filteredRecords = records.filter(r => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      r.repo.toLowerCase().includes(q) ||
      (r.pullNumber && String(r.pullNumber).includes(q)) ||
      (r.author && r.author.toLowerCase().includes(q)) ||
      r.event.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-[#12141c] rounded-xl border border-white/5 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                PR Audit Log & Webhook Review History
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Complete trace of all autonomous reviews, webhook triggers, and AST scans executed by the daemon.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchAuditLog}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-[#181a24] hover:bg-white/10 text-neutral-300 hover:text-white border border-white/5 text-xs font-medium flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Log</span>
            </button>
          </div>
        </div>

        {/* Filter input */}
        <div className="mt-4">
          <input
            type="text"
            placeholder="Search audit records by repo, PR #, or author..."
            value={filterQuery}
            onChange={e => setFilterQuery(e.target.value)}
            className="w-full bg-[#0c0d12] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-xs">
          {error}
        </div>
      )}

      {/* Table view */}
      <div className="bg-[#12141c] rounded-xl border border-white/5 overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <History className="w-10 h-10 text-neutral-500" />
            <h3 className="text-sm font-semibold text-white">No Audit Records Yet</h3>
            <p className="text-xs text-neutral-400 max-w-sm">
              Trigger a diff analysis or configure a GitHub webhook to start capturing historical review events.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-[#161822] text-neutral-400 text-[11px] uppercase border-b border-white/5 select-none">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4">Target Repo</th>
                  <th className="py-3 px-4">PR / Author</th>
                  <th className="py-3 px-4">Risk Score</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredRecords.map((record) => {
                  const dateStr = new Date(record.timestamp).toLocaleString();
                  const isPassed = record.status === 'PASSED';
                  return (
                    <tr key={record.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 text-neutral-400 whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                          {record.event}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white font-semibold">
                        {record.repo}
                      </td>
                      <td className="py-3 px-4 text-neutral-300">
                        {record.pullNumber ? (
                          <div className="flex items-center space-x-1.5">
                            <GitPullRequest className="w-3 h-3 text-indigo-400" />
                            <span>#{record.pullNumber}</span>
                            {record.author && <span className="text-neutral-500">(@{record.author})</span>}
                          </div>
                        ) : (
                          <span className="text-neutral-500">Local Diff</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold">
                        {record.riskScore !== undefined ? (
                          <span className={record.riskScore >= 70 ? 'text-emerald-400' : 'text-red-400'}>
                            {record.riskScore}/100
                          </span>
                        ) : (
                          <span className="text-neutral-500">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          isPassed
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : 'bg-red-500/10 text-red-300 border-red-500/30'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {record.pullNumber ? (
                          <button
                            onClick={() => handleReReview(record)}
                            disabled={reRunningId === record.id}
                            className="px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/30 text-[11px] font-medium inline-flex items-center space-x-1 transition-all disabled:opacity-50"
                          >
                            <Play className={`w-3 h-3 ${reRunningId === record.id ? 'animate-spin' : ''}`} />
                            <span>{reRunningId === record.id ? 'Reviewing...' : 'Re-run Review'}</span>
                          </button>
                        ) : (
                          <span className="text-neutral-600 text-[11px]">Logged</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
