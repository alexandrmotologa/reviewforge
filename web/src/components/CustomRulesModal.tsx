import React, { useState } from 'react';
import { X, Play, Save, CheckCircle2, AlertTriangle, Shield, Sliders } from 'lucide-react';
import { SecuritySeverity } from '../types';

interface CustomRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomRulesModal: React.FC<CustomRulesModalProps> = ({ isOpen, onClose }) => {
  const [ruleId, setRuleId] = useState('custom_forbidden_eval');
  const [title, setTitle] = useState('Forbidden eval() Call Detected');
  const [severity, setSeverity] = useState<SecuritySeverity>('critical');
  const [cwe, setCwe] = useState('CWE-95');
  const [pattern, setPattern] = useState('\\beval\\s*\\([^)]+\\)');
  const [remediation, setRemediation] = useState('Avoid eval() completely; parse inputs with JSON.parse() or structured logic.');
  const [testCode, setTestCode] = useState(`function parseFormula(raw) {
  // Vulnerable execution:
  const result = eval(raw);
  return result;
}`);

  const [testResult, setTestResult] = useState<{
    matchesCount: number;
    matches: Array<{ line: number; text: string }>;
    validRegex: boolean;
    error?: string;
  } | null>(null);

  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestRule = async () => {
    setIsTesting(true);
    setGeneralError(null);
    try {
      const res = await fetch('/api/rules/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pattern,
          code: testCode,
          severity
        })
      });
      const data = await res.json() as any;
      if (!res.ok) {
        throw new Error(data.error || 'Failed to test rule');
      }
      setTestResult(data);
    } catch (err: any) {
      setGeneralError(err.message || 'Error testing regex pattern');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveRule = async () => {
    setIsSaving(true);
    setGeneralError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/rules/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: ruleId,
          title,
          severity,
          cwe,
          pattern,
          description: title,
          remediation
        })
      });
      const data = await res.json() as any;
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save rule');
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setGeneralError(err.message || 'Error saving rule to .reviewforge.yml');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#12141c] rounded-2xl border border-white/10 w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-[#161822] px-6 py-4 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Custom Rule Sandbox & Policy Editor</h2>
              <p className="text-[11px] text-neutral-400">Define, test in real-time, and persist custom regex rules to .reviewforge.yml</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 font-sans text-xs">
          {generalError && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-red-200">
              {generalError}
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Rule successfully persisted to <code>.reviewforge.yml</code>! Active on subsequent scans.</span>
            </div>
          )}

          {/* Rule Meta Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-neutral-400 text-[11px] font-mono uppercase mb-1">Rule ID</label>
              <input
                type="text"
                value={ruleId}
                onChange={e => setRuleId(e.target.value)}
                className="w-full bg-[#0c0d12] border border-white/10 rounded-lg px-3 py-2 font-mono text-neutral-200 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <div>
              <label className="block text-neutral-400 text-[11px] font-mono uppercase mb-1">Rule Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-[#0c0d12] border border-white/10 rounded-lg px-3 py-2 text-neutral-200 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <div>
              <label className="block text-neutral-400 text-[11px] font-mono uppercase mb-1">Severity</label>
              <select
                value={severity}
                onChange={e => setSeverity(e.target.value as SecuritySeverity)}
                className="w-full bg-[#0c0d12] border border-white/10 rounded-lg px-3 py-2 font-mono text-neutral-200 focus:outline-none focus:border-indigo-500/50"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-neutral-400 text-[11px] font-mono uppercase mb-1">CWE Reference</label>
              <input
                type="text"
                value={cwe}
                onChange={e => setCwe(e.target.value)}
                className="w-full bg-[#0c0d12] border border-white/10 rounded-lg px-3 py-2 font-mono text-neutral-200 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>

          {/* Regex Pattern */}
          <div>
            <label className="block text-neutral-400 text-[11px] font-mono uppercase mb-1">Regex Pattern</label>
            <input
              type="text"
              value={pattern}
              onChange={e => setPattern(e.target.value)}
              className="w-full bg-[#0c0d12] border border-white/10 rounded-lg px-3 py-2 font-mono text-emerald-400 focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          {/* Remediation */}
          <div>
            <label className="block text-neutral-400 text-[11px] font-mono uppercase mb-1">Remediation Guidance</label>
            <input
              type="text"
              value={remediation}
              onChange={e => setRemediation(e.target.value)}
              className="w-full bg-[#0c0d12] border border-white/10 rounded-lg px-3 py-2 text-neutral-200 focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          {/* Live Test Sandbox */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-neutral-400 text-[11px] font-mono uppercase">
                Sandbox Test Code
              </label>
              <button
                onClick={handleTestRule}
                disabled={isTesting}
                className="px-2.5 py-1 rounded bg-indigo-600/30 text-indigo-200 hover:bg-indigo-600/50 border border-indigo-500/30 text-xs font-mono font-medium flex items-center space-x-1.5 transition-all disabled:opacity-50"
              >
                <Play className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                <span>Test Pattern Match</span>
              </button>
            </div>
            <textarea
              rows={4}
              value={testCode}
              onChange={e => setTestCode(e.target.value)}
              className="w-full bg-[#0c0d12] border border-white/10 rounded-lg p-3 font-mono text-xs text-neutral-200 focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          {/* Test Results Output */}
          {testResult && (
            <div className={`p-3 rounded-lg border text-xs font-mono ${
              testResult.matchesCount > 0
                ? 'bg-red-950/20 border-red-500/30 text-red-200'
                : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
            }`}>
              <div className="flex items-center justify-between font-bold">
                <span>Matches Detected: {testResult.matchesCount}</span>
                <span>Regex Valid: {testResult.validRegex ? 'YES' : 'NO'}</span>
              </div>
              {testResult.matches.length > 0 && (
                <div className="mt-2 space-y-1 text-[11px]">
                  {testResult.matches.map((m, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <span className="text-neutral-500">Line {m.line}:</span>
                      <code className="text-white bg-white/5 px-1 rounded">{m.text}</code>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-[#161822] px-6 py-4 flex items-center justify-between border-t border-white/5">
          <span className="text-[11px] text-neutral-400 font-mono">
            Writes to <code>.reviewforge.yml</code> under <code>custom_rules</code>
          </span>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#181a24] hover:bg-white/10 text-neutral-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveRule}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center space-x-1.5 transition-colors disabled:opacity-50 shadow-md"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Rule to Config'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
