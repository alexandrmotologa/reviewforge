import React, { useState } from 'react';
import { FileDiff, SecurityFinding } from '../types';
import { FileCode, AlertTriangle, ShieldAlert, Code2, Copy, Check } from 'lucide-react';

interface DiffViewerProps {
  files: FileDiff[];
  findings: SecurityFinding[];
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ files, findings }) => {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [expandedFindings, setExpandedFindings] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!files || files.length === 0) {
    return (
      <div className="bg-[#12141c] rounded-xl border border-white/5 p-12 text-center flex flex-col items-center justify-center space-y-3">
        <FileCode className="w-10 h-10 text-neutral-500" />
        <h3 className="text-sm font-semibold text-white">No Diff Loaded</h3>
        <p className="text-xs text-neutral-400">
          Run an AST diff review from the Playground or fetch a PR to inspect changes.
        </p>
      </div>
    );
  }

  const activeFile = files[selectedFileIndex] || files[0];

  // Map findings for this active file by line number
  const findingsByLine = new Map<number, SecurityFinding>();
  for (const f of findings) {
    if (f.filePath === activeFile.newPath) {
      findingsByLine.set(f.line, f);
    }
  }

  const toggleFinding = (lineNo: number) => {
    setExpandedFindings(prev => ({
      ...prev,
      [lineNo]: !prev[lineNo]
    }));
  };

  const copySuggestion = (key: string, code: string) => {
    navigator.clipboard.writeText(`\`\`\`suggestion\n${code}\n\`\`\``);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* File Navigation Sidebar */}
      <div className="lg:col-span-4 flex flex-col space-y-2">
        <div className="bg-[#12141c] p-3 rounded-xl border border-white/5">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-2 py-1">
            Changed Files ({files.length})
          </h3>
          <div className="mt-2 space-y-1">
            {files.map((file, idx) => {
              const fileFindingCount = findings.filter(f => f.filePath === file.newPath).length;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedFileIndex(idx)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs font-mono flex items-center justify-between transition-all ${
                    idx === selectedFileIndex
                      ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/30'
                      : 'text-neutral-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <FileCode className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">{file.newPath}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <span className="text-[10px] text-emerald-400 font-bold">+{file.totalAdditions}</span>
                    <span className="text-[10px] text-rose-400 font-bold">-{file.totalDeletions}</span>
                    {fileFindingCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-red-500/20 text-red-300">
                        {fileFindingCount}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Diff Code Stage */}
      <div className="lg:col-span-8 flex flex-col">
        <div className="bg-[#12141c] rounded-xl border border-white/5 overflow-hidden flex flex-col flex-1">
          {/* Header */}
          <div className="bg-[#161822] px-4 py-3 flex items-center justify-between border-b border-white/5">
            <div className="text-xs font-mono text-white flex items-center space-x-2">
              <span className="font-semibold">{activeFile.newPath}</span>
              <span className="text-neutral-500">|</span>
              <span className="text-emerald-400">+{activeFile.totalAdditions}</span>
              <span className="text-rose-400">-{activeFile.totalDeletions}</span>
            </div>
            <span className="text-[11px] font-mono text-neutral-400">
              {activeFile.hunks.length} hunk(s)
            </span>
          </div>

          {/* Diff View */}
          <div className="overflow-x-auto bg-[#0a0b0f] font-mono text-xs">
            {activeFile.hunks.map((hunk, hunkIdx) => (
              <div key={hunkIdx} className="border-b border-white/5 last:border-b-0">
                {/* Hunk Header */}
                <div className="bg-[#141624] text-neutral-400 px-4 py-1.5 text-[11px] border-b border-white/5 select-none font-semibold">
                  {hunk.header}
                </div>

                {/* Lines */}
                {hunk.lines.map((line, lineIdx) => {
                  const lineNo = line.newLineNumber || line.oldLineNumber || 0;
                  const finding = line.newLineNumber ? findingsByLine.get(line.newLineNumber) : undefined;
                  const isExpanded = finding ? Boolean(expandedFindings[finding.line]) : false;

                  return (
                    <React.Fragment key={lineIdx}>
                      <div
                        className={`flex items-stretch hover:bg-white/[0.03] transition-colors ${
                          line.type === 'add'
                            ? 'bg-emerald-950/20 text-emerald-200'
                            : line.type === 'delete'
                            ? 'bg-rose-950/25 text-rose-200'
                            : 'text-neutral-300'
                        }`}
                      >
                        {/* Old Line # */}
                        <div className="w-12 px-2 py-0.5 text-right text-[11px] text-neutral-600 select-none border-r border-white/5 shrink-0">
                          {line.oldLineNumber || ''}
                        </div>

                        {/* New Line # */}
                        <div className="w-12 px-2 py-0.5 text-right text-[11px] text-neutral-600 select-none border-r border-white/5 shrink-0">
                          {line.newLineNumber || ''}
                        </div>

                        {/* Line Prefix */}
                        <div className="w-6 py-0.5 text-center text-[11px] select-none font-bold shrink-0">
                          {line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' '}
                        </div>

                        {/* Line Content */}
                        <div className="flex-1 py-0.5 px-2 whitespace-pre overflow-x-auto flex items-center justify-between">
                          <span>{line.content}</span>

                          {/* Inline finding pill */}
                          {finding && (
                            <button
                              onClick={() => toggleFinding(finding.line)}
                              className="ml-2 px-2 py-0.5 rounded text-[10px] font-mono font-medium flex items-center space-x-1 bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-all shrink-0"
                            >
                              <ShieldAlert className="w-3 h-3 text-red-400" />
                              <span>{finding.cwe}: {finding.title}</span>
                              <span className="underline ml-1">
                                {isExpanded ? 'Hide Fix' : 'View Fix'}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expanded Inline Suggestion Box */}
                      {finding && isExpanded && (
                        <div className="bg-[#12141f] border-y border-red-500/30 p-3 mx-4 my-2 rounded-lg text-xs">
                          <div className="flex items-center justify-between pb-2 border-b border-white/5">
                            <div className="flex items-center space-x-2 text-red-300 font-semibold">
                              <AlertTriangle className="w-4 h-4 text-red-400" />
                              <span>{finding.title} ({finding.cwe})</span>
                            </div>
                            {finding.suggestionCode && (
                              <button
                                onClick={() => copySuggestion(String(finding.line), finding.suggestionCode!)}
                                className="px-2 py-1 rounded bg-indigo-600/30 text-indigo-200 hover:bg-indigo-600/50 text-[11px] font-medium flex items-center space-x-1 border border-indigo-500/30 transition-all"
                              >
                                {copiedKey === String(finding.line) ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span>Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 text-indigo-300" />
                                    <span>Copy 1-Click Suggestion</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                          <p className="mt-2 text-neutral-300 font-sans text-xs leading-relaxed">
                            {finding.description}
                          </p>
                          {finding.suggestionCode && (
                            <div className="mt-2 bg-[#0c0d12] rounded p-2.5 border border-indigo-500/20 text-emerald-300 font-mono text-[11px] overflow-x-auto">
                              <code>+ {finding.suggestionCode}</code>
                            </div>
                          )}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
