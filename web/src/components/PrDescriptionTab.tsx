import React, { useState } from 'react';
import { PrDescriptionResult, BreakingChangeFinding, SecurityScorecard } from '../types';
import { GitPullRequest, Copy, Check, AlertTriangle, FileText, Sparkles, BookOpen } from 'lucide-react';

interface PrDescriptionTabProps {
  prDescription?: PrDescriptionResult;
  breakingChanges: BreakingChangeFinding[];
  scorecard: SecurityScorecard | null;
}

export const PrDescriptionTab: React.FC<PrDescriptionTabProps> = ({
  prDescription,
  breakingChanges,
  scorecard
}) => {
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [copiedChangelog, setCopiedChangelog] = useState(false);

  if (!prDescription) {
    return (
      <div className="bg-[#12141c] rounded-xl border border-white/5 p-12 text-center flex flex-col items-center justify-center space-y-3">
        <GitPullRequest className="w-10 h-10 text-neutral-500" />
        <h3 className="text-sm font-semibold text-white">No PR Description Generated</h3>
        <p className="text-xs text-neutral-400 max-w-sm">
          Run an AST diff review from the Playground to synthesize a conventional PR title, markdown description, and changelog.
        </p>
      </div>
    );
  }

  const copyToClipboard = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'security':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'fix':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'refactor':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      default:
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Title Card */}
      <div className="bg-[#12141c] rounded-xl border border-white/5 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono uppercase font-semibold border ${getTypeBadgeClass(prDescription.conventionalType)}`}>
                {prDescription.conventionalType}
              </span>
              <span className="text-xs font-mono text-neutral-400 bg-white/5 px-2 py-0.5 rounded">
                scope: {prDescription.scope}
              </span>
              {breakingChanges.length > 0 && (
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-red-950/80 text-rose-300 border border-red-500/40 flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  <span>BREAKING CHANGE</span>
                </span>
              )}
            </div>
            <h2 className="text-base font-mono font-bold text-white tracking-tight mt-1">
              {prDescription.title}
            </h2>
          </div>

          <button
            onClick={() => copyToClipboard(prDescription.title, setCopiedTitle)}
            className="self-start md:self-center px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-200 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-medium flex items-center space-x-1.5 transition-all"
          >
            {copiedTitle ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Title Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-indigo-300" />
                <span>Copy PR Title</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs font-mono">
          <div className="bg-[#181a24] p-2.5 rounded-lg border border-white/5">
            <span className="text-neutral-400 block text-[10px]">RISK SCORE</span>
            <span className={`text-sm font-bold ${scorecard && scorecard.riskScore >= 70 ? 'text-emerald-400' : 'text-red-400'}`}>
              {scorecard ? `${scorecard.riskScore}/100` : 'N/A'}
            </span>
          </div>
          <div className="bg-[#181a24] p-2.5 rounded-lg border border-white/5">
            <span className="text-neutral-400 block text-[10px]">VULNERABILITIES</span>
            <span className="text-sm font-bold text-neutral-200">
              {scorecard ? scorecard.totalFindings : 0}
            </span>
          </div>
          <div className="bg-[#181a24] p-2.5 rounded-lg border border-white/5">
            <span className="text-neutral-400 block text-[10px]">BREAKING CONTRACTS</span>
            <span className={`text-sm font-bold ${breakingChanges.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {breakingChanges.length}
            </span>
          </div>
          <div className="bg-[#181a24] p-2.5 rounded-lg border border-white/5">
            <span className="text-neutral-400 block text-[10px]">CONVENTIONAL SPEC</span>
            <span className="text-sm font-bold text-indigo-400">v1.0.0</span>
          </div>
        </div>
      </div>

      {/* Markdown Description */}
      <div className="bg-[#12141c] rounded-xl border border-white/5 overflow-hidden">
        <div className="bg-[#161822] px-4 py-3 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center space-x-2 text-xs font-semibold text-white">
            <FileText className="w-4 h-4 text-indigo-400" />
            <span>Structured PR Description (Markdown)</span>
          </div>
          <button
            onClick={() => copyToClipboard(prDescription.markdownDescription, setCopiedBody)}
            className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-500 text-xs font-medium flex items-center space-x-1.5 transition-all shadow-sm"
          >
            {copiedBody ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Description Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Full Description</span>
              </>
            )}
          </button>
        </div>

        <div className="p-5 font-mono text-xs bg-[#0b0c10] text-neutral-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
          {prDescription.markdownDescription}
        </div>
      </div>

      {/* Conventional Changelog Entry */}
      <div className="bg-[#12141c] rounded-xl border border-white/5 overflow-hidden">
        <div className="bg-[#161822] px-4 py-3 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center space-x-2 text-xs font-semibold text-white">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>CHANGELOG.md Entry</span>
          </div>
          <button
            onClick={() => copyToClipboard(prDescription.changelogEntry, setCopiedChangelog)}
            className="px-3 py-1 rounded bg-white/10 hover:bg-white/15 text-neutral-200 text-xs font-medium flex items-center space-x-1.5 transition-all"
          >
            {copiedChangelog ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Changelog Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Changelog Snippet</span>
              </>
            )}
          </button>
        </div>

        <div className="p-4 font-mono text-xs bg-[#0b0c10] text-emerald-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
          {prDescription.changelogEntry}
        </div>
      </div>
    </div>
  );
};
