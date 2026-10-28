import React from 'react';
import { ShieldCheck, GitPullRequest, Terminal, Settings, Cpu, ExternalLink, FileDiff } from 'lucide-react';
import { HealthStatus } from '../types';

interface HeaderProps {
  activeTab: 'playground' | 'diff' | 'findings' | 'scorecard' | 'tests';
  setActiveTab: (tab: 'playground' | 'diff' | 'findings' | 'scorecard' | 'tests') => void;
  health: HealthStatus | null;
  onOpenSettings: () => void;
  findingsCount: number;
  testsCount: number;
  filesCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  health,
  onOpenSettings,
  findingsCount,
  testsCount,
  filesCount
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0f1015]/90 backdrop-blur-md border-b border-white/10 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-lg tracking-tight text-white">ReviewForge</span>
              <span className="text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-medium">
                v1.0.0
              </span>
            </div>
            <p className="text-xs text-neutral-400 hidden sm:block">
              AST Semantic Diff Reviewer & OWASP Auditor
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 bg-[#161822] p-1 rounded-lg border border-white/5">
          <button
            onClick={() => setActiveTab('playground')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center space-x-1.5 transition-all ${
              activeTab === 'playground'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Playground & PR</span>
          </button>

          <button
            onClick={() => setActiveTab('diff')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center space-x-1.5 transition-all ${
              activeTab === 'diff'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
            }`}
          >
            <FileDiff className="w-3.5 h-3.5" />
            <span>Interactive Diff</span>
            {filesCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/10 text-neutral-300 font-mono">
                {filesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('findings')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center space-x-1.5 transition-all ${
              activeTab === 'findings'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
            }`}
          >
            <GitPullRequest className="w-3.5 h-3.5" />
            <span>Findings</span>
            {findingsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-red-500/20 text-red-300 font-mono">
                {findingsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('scorecard')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center space-x-1.5 transition-all ${
              activeTab === 'scorecard'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Security Scorecard</span>
          </button>

          <button
            onClick={() => setActiveTab('tests')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center space-x-1.5 transition-all ${
              activeTab === 'tests'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Synthesized Tests</span>
            {testsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
                {testsCount}
              </span>
            )}
          </button>
        </nav>

        {/* Status & Actions */}
        <div className="flex items-center space-x-3">
          <div className="hidden md:flex items-center space-x-2 text-xs bg-[#161822] px-2.5 py-1.5 rounded-md border border-white/5">
            <span
              className={`w-2 h-2 rounded-full ${
                health?.providerStatus.ok ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-neutral-300 font-mono capitalize">
              {health ? `${health.provider}: ${health.model}` : 'Checking daemon...'}
            </span>
          </div>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-[#161822] hover:bg-white/10 text-neutral-300 hover:text-white border border-white/5 transition-colors"
            title="Model & Provider Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <a
            href="https://github.com/alexandrmotologa/reviewforge"
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-lg bg-[#161822] hover:bg-white/10 text-neutral-300 hover:text-white border border-white/5 transition-colors"
            title="GitHub Repository"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </header>
  );
};
