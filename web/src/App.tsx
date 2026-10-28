import React, { useState } from 'react';
import { Header } from './components/Header';
import { DiffPlayground } from './components/DiffPlayground';
import { DiffViewer } from './components/DiffViewer';
import { PrReviewCard } from './components/PrReviewCard';
import { SecurityScorecard } from './components/SecurityScorecard';
import { SynthesizedTests } from './components/SynthesizedTests';
import { ModelSettingsModal } from './components/ModelSettingsModal';
import { useReviewSession } from './hooks/useReviewSession';
import { ShieldCheck, Filter, CheckCircle2 } from 'lucide-react';

export const App: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    currentResult,
    isLoading,
    isPublishing,
    error,
    successMessage,
    health,
    isSettingsOpen,
    setIsSettingsOpen,
    analyzeDiff,
    analyzePrUrl,
    publishReview,
    refreshHealth
  } = useReviewSession();

  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const findings = currentResult?.scorecard.findings || [];
  const filteredFindings = severityFilter === 'all'
    ? findings
    : findings.filter((f) => f.severity.toLowerCase() === severityFilter.toLowerCase());

  return (
    <div className="min-h-screen bg-[#0b0c10] text-[#e0e2ec] flex flex-col">
      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        health={health}
        onOpenSettings={() => setIsSettingsOpen(true)}
        findingsCount={findings.length}
        testsCount={currentResult?.synthesizedTests.length || 0}
        filesCount={currentResult?.fileDiffs.length || 0}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-xs flex items-center justify-between">
            <span>{error}</span>
          </div>
        )}
        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tab 1: Playground & PR URL */}
        {activeTab === 'playground' && (
          <DiffPlayground
            onAnalyzeDiff={analyzeDiff}
            onAnalyzePrUrl={analyzePrUrl}
            onPublishReview={publishReview}
            isLoading={isLoading}
            isPublishing={isPublishing}
            currentResult={currentResult}
            onSelectTab={setActiveTab}
          />
        )}

        {/* Tab 2: Interactive Diff Viewer */}
        {activeTab === 'diff' && (
          <DiffViewer
            files={currentResult?.fileDiffs || []}
            findings={currentResult?.scorecard.findings || []}
          />
        )}

        {/* Tab 3: Findings & 1-Click Suggestions */}
        {activeTab === 'findings' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#12141c] p-3 rounded-xl border border-white/5">
              <div className="flex items-center space-x-2 text-xs text-neutral-300">
                <Filter className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-medium">Filter by Severity:</span>
              </div>

              <div className="flex items-center space-x-1.5 text-xs">
                {['all', 'critical', 'high', 'medium', 'low'].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium uppercase font-mono transition-all ${
                      severityFilter === sev
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-[#181a26] text-neutral-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            {/* Findings List */}
            {filteredFindings.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {filteredFindings.map((finding, idx) => (
                  <PrReviewCard key={`${finding.filePath}-${finding.line}-${idx}`} finding={finding} />
                ))}
              </div>
            ) : (
              <div className="bg-[#12141c] rounded-xl border border-white/5 p-12 text-center flex flex-col items-center justify-center space-y-3">
                <ShieldCheck className="w-10 h-10 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">
                  {findings.length === 0 ? 'No Vulnerabilities Found' : 'No Findings Match This Severity'}
                </h3>
                <p className="text-xs text-neutral-400 max-w-sm">
                  {findings.length === 0
                    ? 'The analyzed code changes passed all static OWASP Top 10 rules.'
                    : 'Try selecting a different severity filter above.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Security Scorecard & Breaking Changes */}
        {activeTab === 'scorecard' && (
          <SecurityScorecard
            scorecard={currentResult?.scorecard || null}
            reviewId={currentResult?.id}
            markdownReport={currentResult?.markdownReport}
            breakingChanges={currentResult?.breakingChanges || []}
          />
        )}

        {/* Tab 5: Synthesized Tests */}
        {activeTab === 'tests' && (
          <SynthesizedTests tests={currentResult?.synthesizedTests || []} />
        )}
      </main>

      {/* Model Settings Modal */}
      <ModelSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        health={health}
        onSettingsSaved={refreshHealth}
      />
    </div>
  );
};
