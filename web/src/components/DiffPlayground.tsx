import React, { useState } from 'react';
import { Play, Sparkles, FileCode, CheckCircle2, AlertOctagon, RotateCcw } from 'lucide-react';
import { ReviewResult } from '../types';

interface DiffPlaygroundProps {
  onAnalyze: (diff: string, generateTests: boolean, framework: string) => Promise<void>;
  isLoading: boolean;
  currentResult: ReviewResult | null;
  onSelectFindingTab: () => void;
}

const SAMPLE_PRESETS = {
  vulnerableTs: `diff --git a/src/api/users.ts b/src/api/users.ts
new file mode 100644
--- /dev/null
+++ b/src/api/users.ts
@@ -0,0 +1,15 @@
+import { db } from '../db';
+import fs from 'fs';
+import path from 'path';
+
+export async function getUserProfile(userId: string, req: any) {
+  // Unsafe database query with template literal
+  const query = \`SELECT * FROM users WHERE id = \${userId}\`;
+  const result = await db.query(query);
+
+  // Unsafe filesystem read with user input
+  const avatarPath = path.join('/var/app/avatars', req.query.avatar);
+  const avatar = fs.readFileSync(avatarPath);
+
+  return { result, avatar };
+}
+`,
  cleanTs: `diff --git a/src/math/geometry.ts b/src/math/geometry.ts
--- a/src/math/geometry.ts
+++ b/src/math/geometry.ts
@@ -1,5 +1,6 @@
 export function calculateCircleArea(radius: number): number {
   if (radius < 0) {
     throw new Error('Radius cannot be negative');
   }
-  return 3.14 * radius * radius;
+  // Precision upgrade using Math.PI
+  return Math.PI * radius * radius;
 }
`,
  vulnerablePy: `diff --git a/app/admin.py b/app/admin.py
new file mode 100644
--- /dev/null
+++ b/app/admin.py
@@ -0,0 +1,8 @@
+import os
+
+ADMIN_TOKEN = "ghp_11223344556677889900aabbccddeeff001122"
+
+def run_diagnostic(target_host: str):
+    # Command injection via os.system
+    command = f"ping -c 1 {target_host}"
+    return os.system(command)
+`
};

export const DiffPlayground: React.FC<DiffPlaygroundProps> = ({
  onAnalyze,
  isLoading,
  currentResult,
  onSelectFindingTab
}) => {
  const [diffText, setDiffText] = useState(SAMPLE_PRESETS.vulnerableTs);
  const [generateTests, setGenerateTests] = useState(true);
  const [framework, setFramework] = useState('vitest');

  const handleRun = async () => {
    if (!diffText.trim()) return;
    await onAnalyze(diffText, generateTests, framework);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Input Column */}
      <div className="lg:col-span-7 flex flex-col space-y-4">
        <div className="bg-[#12141c] rounded-xl border border-white/5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-white/5">
            <div className="flex items-center space-x-2">
              <FileCode className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">Git Unified Diff Input</h2>
            </div>

            {/* Presets */}
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-neutral-500 text-[11px] mr-1">Presets:</span>
              <button
                type="button"
                onClick={() => setDiffText(SAMPLE_PRESETS.vulnerableTs)}
                className="px-2 py-1 rounded bg-[#181a26] text-neutral-300 hover:text-white hover:bg-white/10 text-[11px] border border-white/5 transition-all"
              >
                Vulnerable TS
              </button>
              <button
                type="button"
                onClick={() => setDiffText(SAMPLE_PRESETS.cleanTs)}
                className="px-2 py-1 rounded bg-[#181a26] text-neutral-300 hover:text-white hover:bg-white/10 text-[11px] border border-white/5 transition-all"
              >
                Clean TS
              </button>
              <button
                type="button"
                onClick={() => setDiffText(SAMPLE_PRESETS.vulnerablePy)}
                className="px-2 py-1 rounded bg-[#181a26] text-neutral-300 hover:text-white hover:bg-white/10 text-[11px] border border-white/5 transition-all"
              >
                Python Secrets
              </button>
              <button
                type="button"
                onClick={() => setDiffText('')}
                className="p-1 rounded bg-[#181a26] text-neutral-400 hover:text-white hover:bg-white/10 border border-white/5"
                title="Clear diff input"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Text Area */}
          <div className="relative">
            <textarea
              value={diffText}
              onChange={(e) => setDiffText(e.target.value)}
              placeholder="Paste unified git diff (diff --git a/... b/...)..."
              rows={16}
              className="w-full bg-[#0a0b0f] text-[#d6d9e0] font-mono text-xs rounded-lg p-3.5 border border-white/10 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed resize-y"
              spellCheck={false}
            />
          </div>

          {/* Options & Action Bar */}
          <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-4 text-xs">
              <label className="flex items-center space-x-2 text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generateTests}
                  onChange={(e) => setGenerateTests(e.target.checked)}
                  className="rounded border-neutral-700 text-indigo-600 focus:ring-indigo-500 bg-[#0a0b0f]"
                />
                <span>Synthesize Unit Tests</span>
              </label>

              <div className="flex items-center space-x-2 text-neutral-400">
                <span>Framework:</span>
                <select
                  value={framework}
                  onChange={(e) => setFramework(e.target.value)}
                  className="bg-[#181a26] text-neutral-200 border border-white/10 rounded px-2 py-1 text-xs focus:outline-none"
                >
                  <option value="vitest">Vitest</option>
                  <option value="jest">Jest</option>
                  <option value="pytest">Pytest</option>
                  <option value="go">Go test</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleRun}
              disabled={isLoading || !diffText.trim()}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs flex items-center space-x-2 shadow-sm transition-all"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Analyzing AST...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Review & Audit</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Review Summary Column */}
      <div className="lg:col-span-5 flex flex-col space-y-4">
        {currentResult ? (
          <div className="bg-[#12141c] rounded-xl border border-white/5 p-5 flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Analysis Summary</h3>
              </div>
              <span className="text-[11px] font-mono text-neutral-400">
                ID: {currentResult.id}
              </span>
            </div>

            {/* Risk Gauge Card */}
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                currentResult.scorecard.passed
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : 'bg-red-950/20 border-red-500/30'
              }`}
            >
              <div>
                <div className="text-xs uppercase font-mono tracking-wider text-neutral-400">
                  Security Risk Score
                </div>
                <div className="text-2xl font-bold font-mono text-white mt-1">
                  {currentResult.scorecard.riskScore}
                  <span className="text-sm text-neutral-400 font-normal"> / 100</span>
                </div>
                <div className="text-xs mt-1">
                  {currentResult.scorecard.passed ? (
                    <span className="text-emerald-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Ready to Merge</span>
                    </span>
                  ) : (
                    <span className="text-red-400 flex items-center space-x-1">
                      <AlertOctagon className="w-3.5 h-3.5" />
                      <span>Security Fixes Required</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Counts Badge */}
              <div className="text-right space-y-1">
                <div className="text-xs font-mono">
                  <span className="text-red-400 font-semibold">{currentResult.scorecard.criticalCount}</span> Critical
                </div>
                <div className="text-xs font-mono">
                  <span className="text-amber-400 font-semibold">{currentResult.scorecard.highCount}</span> High
                </div>
                <div className="text-xs font-mono">
                  <span className="text-yellow-400 font-semibold">{currentResult.scorecard.mediumCount}</span> Medium
                </div>
              </div>
            </div>

            {/* Executive Message */}
            <p className="text-xs text-neutral-300 leading-relaxed bg-[#0e1017] p-3 rounded-lg border border-white/5">
              {currentResult.summary}
            </p>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={onSelectFindingTab}
                className="py-2 px-3 rounded-lg bg-[#181a26] hover:bg-white/10 text-neutral-200 text-xs font-medium border border-white/5 text-center transition-all"
              >
                Inspect {currentResult.scorecard.totalFindings} Findings
              </button>
              <button
                onClick={onSelectFindingTab}
                className="py-2 px-3 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-medium border border-indigo-500/30 text-center transition-all"
              >
                View {currentResult.synthesizedTests.length} Tests
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#12141c] rounded-xl border border-white/5 p-8 text-center flex flex-col items-center justify-center space-y-3 min-h-[300px]">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-white">Ready to Review</h3>
            <p className="text-xs text-neutral-400 max-w-xs leading-relaxed">
              Paste unified patch hunks or pick a preset above to inspect AST context, detect OWASP weaknesses, and synthesize unit tests.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
