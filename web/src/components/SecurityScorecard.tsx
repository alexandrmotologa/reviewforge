import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, Download, Copy, Check, ExternalLink } from 'lucide-react';
import { SecurityScorecard as ScorecardType } from '../types';

interface SecurityScorecardProps {
  scorecard: ScorecardType | null;
  reviewId?: string;
  markdownReport?: string;
}

export const SecurityScorecard: React.FC<SecurityScorecardProps> = ({
  scorecard,
  reviewId,
  markdownReport
}) => {
  const [copied, setCopied] = useState(false);

  if (!scorecard) {
    return (
      <div className="bg-[#12141c] rounded-xl border border-white/5 p-12 text-center flex flex-col items-center justify-center space-y-3">
        <ShieldCheck className="w-10 h-10 text-neutral-500" />
        <h3 className="text-sm font-semibold text-white">No Review Session Active</h3>
        <p className="text-xs text-neutral-400">
          Run an AST diff review from the Playground tab to generate a security scorecard.
        </p>
      </div>
    );
  }

  const handleCopyMarkdown = () => {
    if (!markdownReport) return;
    navigator.clipboard.writeText(markdownReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSarif = () => {
    if (!reviewId) return;
    window.open(`/api/reviews/${reviewId}/sarif`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Metric Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Risk Score */}
        <div className="bg-[#12141c] p-5 rounded-xl border border-white/5 flex flex-col justify-between">
          <div className="text-xs font-mono uppercase text-neutral-400">Overall Risk Score</div>
          <div className="my-2 flex items-baseline space-x-2">
            <span className="text-3xl font-bold font-mono text-white">{scorecard.riskScore}</span>
            <span className="text-xs text-neutral-500 font-mono">/ 100</span>
          </div>
          <div className="text-xs font-medium">
            {scorecard.passed ? (
              <span className="text-emerald-400">PASSED (Low Risk)</span>
            ) : (
              <span className="text-red-400">FAILED (Action Required)</span>
            )}
          </div>
        </div>

        {/* Critical */}
        <div className="bg-[#12141c] p-5 rounded-xl border border-red-500/20 flex flex-col justify-between">
          <div className="text-xs font-mono uppercase text-red-300">Critical Vulnerabilities</div>
          <div className="my-2 text-3xl font-bold font-mono text-red-400">
            {scorecard.criticalCount}
          </div>
          <div className="text-xs text-neutral-400">CWE-89, CWE-798, CWE-78</div>
        </div>

        {/* High */}
        <div className="bg-[#12141c] p-5 rounded-xl border border-amber-500/20 flex flex-col justify-between">
          <div className="text-xs font-mono uppercase text-amber-300">High Risk Issues</div>
          <div className="my-2 text-3xl font-bold font-mono text-amber-400">
            {scorecard.highCount}
          </div>
          <div className="text-xs text-neutral-400">CWE-22, CWE-918</div>
        </div>

        {/* Medium & Low */}
        <div className="bg-[#12141c] p-5 rounded-xl border border-white/5 flex flex-col justify-between">
          <div className="text-xs font-mono uppercase text-neutral-400">Medium / Low Issues</div>
          <div className="my-2 text-3xl font-bold font-mono text-neutral-200">
            {scorecard.mediumCount + scorecard.lowCount}
          </div>
          <div className="text-xs text-neutral-400">CWE-1333, CWE-942</div>
        </div>
      </div>

      {/* Export Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#12141c] p-4 rounded-xl border border-white/5">
        <div>
          <h3 className="text-sm font-semibold text-white">Compliance & CI/CD Export</h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Export static analysis results to GitHub Code Scanning or download standard reports.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {reviewId && (
            <button
              onClick={handleDownloadSarif}
              className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium flex items-center space-x-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download SARIF 2.1.0</span>
            </button>
          )}

          <button
            onClick={handleCopyMarkdown}
            className="px-3 py-1.5 rounded-lg bg-[#181a26] hover:bg-white/10 text-neutral-200 border border-white/5 text-xs font-medium flex items-center space-x-1.5 transition-all"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied Report!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Markdown</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* CWE Table */}
      <div className="bg-[#12141c] rounded-xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">OWASP Top 10 Rule Catalog</h3>
          <span className="text-xs font-mono text-neutral-400">7 Active AST Rules</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#161822] text-neutral-400 font-mono text-[11px] uppercase border-b border-white/5">
              <tr>
                <th className="py-2.5 px-4">Rule Identifier</th>
                <th className="py-2.5 px-4">Weakness</th>
                <th className="py-2.5 px-4">CWE</th>
                <th className="py-2.5 px-4">Severity</th>
                <th className="py-2.5 px-4 text-right">Detected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {[
                { id: 'sql-injection', name: 'SQL Injection in Queries', cwe: 'CWE-89', sev: 'Critical' },
                { id: 'path-traversal', name: 'Unvalidated Path Resolution', cwe: 'CWE-22', sev: 'High' },
                { id: 'auth-leak', name: 'Hardcoded Token / Secret Leak', cwe: 'CWE-798', sev: 'Critical' },
                { id: 'command-injection', name: 'Shell Command Concatenation', cwe: 'CWE-78', sev: 'Critical' },
                { id: 'insecure-regex', name: 'Catastrophic Backtracking (ReDoS)', cwe: 'CWE-1333', sev: 'Medium' },
                { id: 'ssrf', name: 'Server-Side Request Forgery', cwe: 'CWE-918', sev: 'High' },
                { id: 'cors-csrf', name: 'Insecure Wildcard CORS Policy', cwe: 'CWE-942', sev: 'Medium' }
              ].map((r) => {
                const count = scorecard.findings.filter((f) => f.ruleId === r.id).length;
                return (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-semibold text-neutral-200">{r.id}</td>
                    <td className="py-3 px-4 font-sans text-neutral-300">{r.name}</td>
                    <td className="py-3 px-4 text-indigo-400">{r.cwe}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          r.sev === 'Critical'
                            ? 'bg-red-500/20 text-red-300'
                            : r.sev === 'High'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-yellow-500/20 text-yellow-300'
                        }`}
                      >
                        {r.sev}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {count > 0 ? (
                        <span className="text-red-400 font-bold">{count}</span>
                      ) : (
                        <span className="text-neutral-500">0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
