import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, Info, Check, Copy, Code2 } from 'lucide-react';
import { SecurityFinding } from '../types';

interface PrReviewCardProps {
  finding: SecurityFinding;
}

export const PrReviewCard: React.FC<PrReviewCardProps> = ({ finding }) => {
  const [copied, setCopied] = useState(false);

  const getSeverityStyle = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return {
          badge: 'bg-red-500/20 text-red-300 border-red-500/30',
          border: 'border-red-500/30 bg-red-950/10',
          icon: <ShieldAlert className="w-4 h-4 text-red-400" />
        };
      case 'high':
        return {
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          border: 'border-amber-500/30 bg-amber-950/10',
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />
        };
      case 'medium':
        return {
          badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
          border: 'border-yellow-500/20 bg-yellow-950/5',
          icon: <AlertTriangle className="w-4 h-4 text-yellow-400" />
        };
      default:
        return {
          badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
          border: 'border-blue-500/20 bg-blue-950/5',
          icon: <Info className="w-4 h-4 text-blue-400" />
        };
    }
  };

  const style = getSeverityStyle(finding.severity);

  const handleCopySuggestion = () => {
    if (!finding.suggestionCode) return;
    const block = `\`\`\`suggestion\n${finding.suggestionCode}\n\`\`\``;
    navigator.clipboard.writeText(block);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`rounded-xl border p-5 transition-all ${style.border} hover:border-opacity-60`}>
      {/* Top Meta Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/5">
        <div className="flex items-center space-x-2.5">
          {style.icon}
          <h3 className="text-sm font-semibold text-white tracking-tight">{finding.title}</h3>
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase border ${style.badge}`}>
            {finding.severity}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-neutral-400 border border-white/10">
            {finding.cwe}
          </span>
        </div>

        <div className="text-xs font-mono text-neutral-400 bg-[#0f1015] px-2.5 py-1 rounded border border-white/5">
          {finding.filePath}:{finding.line}
        </div>
      </div>

      {/* Description */}
      <p className="mt-3 text-xs leading-relaxed text-neutral-300">
        {finding.description}
      </p>

      {/* Code Snippet */}
      {finding.snippet && (
        <div className="mt-3 bg-[#0d0e14] rounded-lg border border-white/5 overflow-hidden">
          <div className="bg-[#141620] px-3 py-1.5 text-[11px] font-mono text-neutral-400 flex items-center justify-between border-b border-white/5">
            <span>Detected Line ({finding.line})</span>
          </div>
          <pre className="p-3 text-xs font-mono text-red-300 overflow-x-auto">
            <code>- {finding.snippet}</code>
          </pre>
        </div>
      )}

      {/* Remediation */}
      <div className="mt-3 bg-neutral-900/60 rounded-lg p-3 border border-white/5 text-xs text-neutral-300">
        <span className="text-neutral-400 font-medium">Remediation: </span>
        {finding.remediation}
      </div>

      {/* 1-Click Suggestion Block */}
      {finding.suggestionCode && (
        <div className="mt-4 bg-[#11131c] rounded-lg border border-indigo-500/20 overflow-hidden">
          <div className="bg-[#181a26] px-3 py-2 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center space-x-2 text-xs font-medium text-indigo-300">
              <Code2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>1-Click GitHub Suggestion</span>
            </div>
            <button
              onClick={handleCopySuggestion}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded text-[11px] font-medium bg-indigo-600/30 text-indigo-200 hover:bg-indigo-600/50 border border-indigo-500/30 transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-indigo-300" />
                  <span>Copy Suggestion</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3 text-xs font-mono text-emerald-300 overflow-x-auto bg-[#0c0d14]">
            <code>+ {finding.suggestionCode}</code>
          </pre>
        </div>
      )}
    </div>
  );
};
