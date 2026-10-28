import React, { useState } from 'react';
import { Cpu, Copy, Check, Download, FileCode, CheckCircle2 } from 'lucide-react';
import { SynthesizedTestFile } from '../types';

interface SynthesizedTestsProps {
  tests: SynthesizedTestFile[];
}

export const SynthesizedTests: React.FC<SynthesizedTestsProps> = ({ tests }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  if (!tests || tests.length === 0) {
    return (
      <div className="bg-[#12141c] rounded-xl border border-white/5 p-12 text-center flex flex-col items-center justify-center space-y-3">
        <Cpu className="w-10 h-10 text-neutral-500" />
        <h3 className="text-sm font-semibold text-white">No Synthesized Tests Available</h3>
        <p className="text-xs text-neutral-400 max-w-sm">
          Run an AST review with &quot;Synthesize Unit Tests&quot; enabled in the Playground to generate runnable test suites for newly modified functions.
        </p>
      </div>
    );
  }

  const activeTest = tests[selectedIndex] || tests[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeTest.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([activeTest.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeTest.testFilePath.split('/').pop() || 'test.ts';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* File List Sidebar */}
      <div className="lg:col-span-4 flex flex-col space-y-2">
        <div className="bg-[#12141c] p-3 rounded-xl border border-white/5">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-2 py-1">
            Generated Test Files ({tests.length})
          </h3>
          <div className="mt-2 space-y-1">
            {tests.map((t, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedIndex(idx)}
                className={`w-full text-left p-2.5 rounded-lg text-xs font-mono flex items-center justify-between transition-all ${
                  idx === selectedIndex
                    ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/30'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <FileCode className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="truncate">{t.testFilePath.split('/').pop()}</span>
                </div>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/5 text-neutral-400">
                  {t.framework}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Coverage Guarantee Card */}
        <div className="bg-[#12141c] p-4 rounded-xl border border-white/5 text-xs text-neutral-300 space-y-2">
          <div className="font-semibold text-white flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Automated Coverage Scope</span>
          </div>
          <ul className="space-y-1 text-neutral-400 text-[11px] list-disc list-inside">
            <li>Happy path validation with typed mock arguments</li>
            <li>Boundary handling (null, empty strings, limits)</li>
            <li>Exception rejection assertions on invalid parameters</li>
          </ul>
        </div>
      </div>

      {/* Code Viewer Panel */}
      <div className="lg:col-span-8 flex flex-col">
        <div className="bg-[#12141c] rounded-xl border border-white/5 overflow-hidden flex flex-col flex-1">
          {/* Header */}
          <div className="bg-[#161822] px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/5">
            <div>
              <div className="text-xs font-mono font-medium text-white flex items-center space-x-2">
                <span>{activeTest.testFilePath}</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {activeTest.framework}
                </span>
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">
                Target: {activeTest.targetFilePath} | {activeTest.testCount} Automated Assertions
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopy}
                className="px-2.5 py-1.5 rounded-lg bg-[#1e2130] hover:bg-white/10 text-neutral-200 text-xs font-medium border border-white/5 flex items-center space-x-1.5 transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownload}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center space-x-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save File</span>
              </button>
            </div>
          </div>

          {/* Code */}
          <pre className="p-4 text-xs font-mono text-[#d1d5db] bg-[#0c0d12] overflow-x-auto leading-relaxed flex-1">
            <code>{activeTest.code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
