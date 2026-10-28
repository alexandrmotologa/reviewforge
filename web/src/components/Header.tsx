import React from 'react';
import {
  ShieldCheck,
  GitPullRequest,
  Terminal,
  Settings,
  Cpu,
  ExternalLink,
  FileDiff,
  FileText,
  Zap,
  History,
  Sliders
} from 'lucide-react';
import { HealthStatus } from '../types';
import { ReviewTabType } from '../hooks/useReviewSession';

interface HeaderProps {
  activeTab: ReviewTabType;
  setActiveTab: (tab: ReviewTabType) => void;
  health: HealthStatus | null;
  onOpenSettings: () => void;
  onOpenRulesModal: () => void;
  findingsCount: number;
  testsCount: number;
  filesCount: number;
  taintCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  health,
  onOpenSettings,
  onOpenRulesModal,
  findingsCount,
  testsCount,
  filesCount,
  taintCount
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0f1015]/95 backdrop-blur-md border-b border-white/10 px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-base tracking-tight text-white">ReviewForge</span>
              <span className="text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded font-medium">
                v1.0.0
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 bg-[#161822] p-1 rounded-lg border border-white/5 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('playground')}
            className={`px-2.5 py-1.5 rounded-md flex items-center space-x-1.5 transition-all whitespace-nowrap ${
              activeTab === 'playground'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Playground</span>
          </button>

          <button
            onClick={() => setActiveTab('diff')}
            className={`px-2.5 py-1.5 rounded-md flex items-center space-x-1.5 transition-all whitespace-nowrap ${
              activeTab === 'diff'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
            }`}
          >
            <FileDiff className="w-3.5 h-3.5" />
            <span>Diff Viewer</span>
            {filesCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/10 text-neutral-300 font-mono">
                {filesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('pr-description')}
            className={`px-2.5 py-1.5 rounded-md flex items-center space-x-1.5 transition-all whitespace-nowrap ${
              activeTab === 'pr-description'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PR Description</span>
          </button>

          <button
            onClick={() => setActiveTab('taint')}
            className={`px-2.5 py-1.5 rounded-md flex items-center space-x-1.5 transition-all whitespace-nowrap ${
              activeTab === 'taint'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Taint Flow</span>
            {taintCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-red-500/20 text-red-300 font-mono">
                {taintCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-2.5 py-1.5 rounded-md flex items-center space-x-1.5 transition-all whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Log</span>
          </button>

          <button
            onClick={() => setActiveTab('findings')}
            className={`px-2.5 py-1.5 rounded-md flex items-center space-x-1.5 transition-all whitespace-nowrap ${
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
            className={`px-2.5 py-1.5 rounded-md flex items-center space-x-1.5 transition-all whitespace-nowrap ${
              activeTab === 'scorecard'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Scorecard</span>
          </button>

          <button
            onClick={() => setActiveTab('tests')}
            className={`px-2.5 py-1.5 rounded-md flex items-center space-x-1.5 transition-all whitespace-nowrap ${
              activeTab === 'tests'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Tests</span>
            {testsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
                {testsCount}
              </span>
            )}
          </button>
        </nav>

        {/* Status & Actions */}
        <div className="flex items-center space-x-2">
          <div className="hidden lg:flex items-center space-x-2 text-xs bg-[#161822] px-2.5 py-1.5 rounded-md border border-white/5">
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
            onClick={onOpenRulesModal}
            className="p-2 rounded-lg bg-[#161822] hover:bg-white/10 text-neutral-300 hover:text-white border border-white/5 transition-colors"
            title="Custom Rules Sandbox & Policy Editor"
          >
            <Sliders className="w-4 h-4 text-indigo-400" />
          </button>

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
