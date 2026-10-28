import React, { useState, useMemo } from 'react';
import { FileDiff, SecurityFinding } from '../types';
import {
  FileCode,
  AlertTriangle,
  ShieldAlert,
  Copy,
  Check,
  CheckCircle2,
  Download,
  Filter,
  Search,
  Wrench,
  RotateCcw
} from 'lucide-react';

interface DiffViewerProps {
  files: FileDiff[];
  findings: SecurityFinding[];
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ files, findings }) => {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [expandedFindings, setExpandedFindings] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Reviewer workflow & progress state
  const [fileFilter, setFileFilter] = useState<'all' | 'vulnerable' | 'clean'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewedFiles, setReviewedFiles] = useState<Record<string, boolean>>({});

  // Applied inline fixes: key is `${filePath}:${line}` -> replacement code
  const [appliedFixes, setAppliedFixes] = useState<Record<string, { original: string; replacement: string }>>({});

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

  // Filter files based on filter mode and search query
  const filteredFiles = useMemo(() => {
    return files.filter(f => {
      const matchSearch = f.newPath.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;

      const fileFindingCount = findings.filter(item => item.filePath === f.newPath).length;
      if (fileFilter === 'vulnerable') return fileFindingCount > 0;
      if (fileFilter === 'clean') return fileFindingCount === 0;
      return true;
    });
  }, [files, findings, fileFilter, searchQuery]);

  const activeFile = filteredFiles[selectedFileIndex] || filteredFiles[0] || files[0];

  // Map findings for active file by line number
  const findingsByLine = useMemo(() => {
    const map = new Map<number, SecurityFinding>();
    for (const f of findings) {
      if (f.filePath === activeFile.newPath) {
        map.set(f.line, f);
      }
    }
    return map;
  }, [findings, activeFile]);

  // Review progress calculations
  const totalReviewed = Object.values(reviewedFiles).filter(Boolean).length;
  const progressPercent = files.length > 0 ? Math.round((totalReviewed / files.length) * 100) : 0;

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

  const toggleReviewed = (path: string) => {
    setReviewedFiles(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const applyFixInline = (filePath: string, line: number, original: string, replacement: string) => {
    const key = `${filePath}:${line}`;
    setAppliedFixes(prev => ({
      ...prev,
      [key]: { original, replacement }
    }));
  };

  const revertFixInline = (filePath: string, line: number) => {
    const key = `${filePath}:${line}`;
    setAppliedFixes(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const downloadPatchedFile = () => {
    // Generate patched text from active file hunks
    const lines: string[] = [];
    for (const hunk of activeFile.hunks) {
      for (const line of hunk.lines) {
        if (line.type !== 'delete') {
          const lineNo = line.newLineNumber;
          const key = lineNo ? `${activeFile.newPath}:${lineNo}` : '';
          if (lineNo && appliedFixes[key]) {
            lines.push(appliedFixes[key].replacement);
          } else {
            lines.push(line.content);
          }
        }
      }
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const baseName = activeFile.newPath.split('/').pop() || 'patched_file';
    a.download = `patched_${baseName}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeFileAppliedCount = Object.keys(appliedFixes).filter(k => k.startsWith(`${activeFile.newPath}:`)).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* File Navigation & Reviewer Progress Sidebar */}
      <div className="lg:col-span-4 flex flex-col space-y-3">
        {/* Progress Tracker Card */}
        <div className="bg-[#12141c] p-4 rounded-xl border border-white/5 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-white flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Review Progress</span>
            </span>
            <span className="font-mono text-indigo-300">{totalReviewed}/{files.length} files ({progressPercent}%)</span>
          </div>
          <div className="w-full bg-[#1c1e2b] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-500 h-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* File Filter & Search Box */}
        <div className="bg-[#12141c] p-3 rounded-xl border border-white/5 space-y-2">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search file path..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setSelectedFileIndex(0);
              }}
              className="w-full bg-[#0c0d12] border border-white/10 rounded-lg pl-8 pr-2.5 py-1.5 text-xs font-mono text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          {/* Mode Selector */}
          <div className="flex items-center space-x-1 text-[11px] font-mono">
            {(['all', 'vulnerable', 'clean'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => {
                  setFileFilter(mode);
                  setSelectedFileIndex(0);
                }}
                className={`flex-1 py-1 rounded capitalize font-medium transition-all ${
                  fileFilter === mode
                    ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/30'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Files List */}
          <div className="mt-2 space-y-1 max-h-[500px] overflow-y-auto">
            {filteredFiles.map((file, idx) => {
              const fileFindingCount = findings.filter(f => f.filePath === file.newPath).length;
              const isReviewed = Boolean(reviewedFiles[file.newPath]);
              const isSelected = activeFile.newPath === file.newPath;

              return (
                <div
                  key={idx}
                  className={`group rounded-lg p-2 text-xs font-mono flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/30'
                      : 'text-neutral-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <button
                    onClick={() => setSelectedFileIndex(idx)}
                    className="flex items-center space-x-2 truncate flex-1 text-left"
                  >
                    <FileCode className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">{file.newPath}</span>
                  </button>

                  <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                    <span className="text-[10px] text-emerald-400 font-bold">+{file.totalAdditions}</span>
                    <span className="text-[10px] text-rose-400 font-bold">-{file.totalDeletions}</span>
                    {fileFindingCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-500/20 text-red-300">
                        {fileFindingCount}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleReviewed(file.newPath);
                      }}
                      title={isReviewed ? 'Mark as Unreviewed' : 'Mark as Reviewed'}
                      className={`p-1 rounded transition-colors ${
                        isReviewed ? 'text-emerald-400 bg-emerald-500/10' : 'text-neutral-600 hover:text-neutral-400'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Diff Code Stage */}
      <div className="lg:col-span-8 flex flex-col">
        <div className="bg-[#12141c] rounded-xl border border-white/5 overflow-hidden flex flex-col flex-1">
          {/* Header */}
          <div className="bg-[#161822] px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-white/5">
            <div className="text-xs font-mono text-white flex items-center space-x-2">
              <span className="font-semibold">{activeFile.newPath}</span>
              <span className="text-neutral-500">|</span>
              <span className="text-emerald-400">+{activeFile.totalAdditions}</span>
              <span className="text-rose-400">-{activeFile.totalDeletions}</span>
              {reviewedFiles[activeFile.newPath] && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                  Reviewed
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {activeFileAppliedCount > 0 && (
                <button
                  onClick={downloadPatchedFile}
                  className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono flex items-center space-x-1.5 transition-all"
                  title="Download File with Applied Fixes"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Patched File ({activeFileAppliedCount})</span>
                </button>
              )}

              <button
                onClick={() => toggleReviewed(activeFile.newPath)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono flex items-center space-x-1.5 border transition-all ${
                  reviewedFiles[activeFile.newPath]
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-[#181a24] text-neutral-300 border-white/5 hover:bg-white/5'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{reviewedFiles[activeFile.newPath] ? 'Reviewed' : 'Mark Reviewed'}</span>
              </button>
            </div>
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

                  const fixKey = line.newLineNumber ? `${activeFile.newPath}:${line.newLineNumber}` : '';
                  const isFixed = Boolean(appliedFixes[fixKey]);
                  const displayContent = isFixed ? appliedFixes[fixKey].replacement : line.content;

                  return (
                    <React.Fragment key={lineIdx}>
                      <div
                        className={`flex items-stretch hover:bg-white/[0.03] transition-colors ${
                          isFixed
                            ? 'bg-emerald-950/40 text-emerald-200 border-l-2 border-emerald-400'
                            : line.type === 'add'
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
                          {isFixed ? '✓' : line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' '}
                        </div>

                        {/* Line Content */}
                        <div className="flex-1 py-0.5 px-2 whitespace-pre overflow-x-auto flex items-center justify-between">
                          <span>{displayContent}</span>

                          {/* Inline finding pill */}
                          {finding && (
                            <div className="flex items-center space-x-1.5 ml-2 shrink-0">
                              {isFixed ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span>Fixed</span>
                                </span>
                              ) : (
                                <button
                                  onClick={() => toggleFinding(finding.line)}
                                  className="px-2 py-0.5 rounded text-[10px] font-mono font-medium flex items-center space-x-1 bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-all"
                                >
                                  <ShieldAlert className="w-3 h-3 text-red-400" />
                                  <span>{finding.cwe}: {finding.title}</span>
                                  <span className="underline ml-1">
                                    {isExpanded ? 'Hide' : 'Fix'}
                                  </span>
                                </button>
                              )}
                            </div>
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
                            <div className="flex items-center space-x-2">
                              {finding.suggestionCode && (
                                <>
                                  <button
                                    onClick={() => copySuggestion(String(finding.line), finding.suggestionCode!)}
                                    className="px-2 py-1 rounded bg-[#181a24] text-neutral-300 hover:text-white text-[11px] font-medium flex items-center space-x-1 border border-white/5 transition-all"
                                  >
                                    {copiedKey === String(finding.line) ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-400" />
                                        <span>Copied!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3 text-neutral-400" />
                                        <span>Copy Suggestion</span>
                                      </>
                                    )}
                                  </button>

                                  {isFixed ? (
                                    <button
                                      onClick={() => revertFixInline(activeFile.newPath, finding.line)}
                                      className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-[11px] font-medium flex items-center space-x-1 border border-amber-500/30 transition-all"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      <span>Revert Fix</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => applyFixInline(activeFile.newPath, finding.line, line.content, finding.suggestionCode!)}
                                      className="px-2.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-500 text-[11px] font-medium flex items-center space-x-1 transition-all shadow-sm"
                                    >
                                      <Wrench className="w-3 h-3" />
                                      <span>Apply Fix Inline</span>
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
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
