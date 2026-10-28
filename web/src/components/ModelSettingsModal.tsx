import React, { useState } from 'react';
import { X, Check, AlertCircle, Cpu, Key, Globe, Sliders } from 'lucide-react';
import { HealthStatus } from '../types';

interface ModelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  health: HealthStatus | null;
  onSettingsSaved: () => void;
}

export const ModelSettingsModal: React.FC<ModelSettingsModalProps> = ({
  isOpen,
  onClose,
  health,
  onSettingsSaved
}) => {
  const [provider, setProvider] = useState<'ollama' | 'openai' | 'anthropic' | 'gemini' | 'offline'>(
    (health?.provider as any) || 'ollama'
  );
  const [baseUrl, setBaseUrl] = useState('http://localhost:11434');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(health?.model || 'deepseek-coder:6.7b');
  const [temperature, setTemperature] = useState(0.2);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // First save temporarily
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, baseUrl, apiKey: apiKey || undefined, model, temperature })
      });

      const res = await fetch('/api/settings/test', { method: 'POST' });
      const data = await res.json() as { ok: boolean; message: string };
      setTestResult(data);
    } catch {
      setTestResult({ ok: false, message: 'Server connection failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, baseUrl, apiKey: apiKey || undefined, model, temperature })
      });
      onSettingsSaved();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#12141c] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">Model Provider & Privacy Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Provider Selection */}
          <div>
            <label className="block text-neutral-300 font-medium mb-1.5">Inference Provider</label>
            <select
              value={provider}
              onChange={(e) => {
                const val = e.target.value as any;
                setProvider(val);
                if (val === 'ollama') setModel('deepseek-coder:6.7b');
                else if (val === 'openai') setModel('gpt-4o');
                else if (val === 'anthropic') setModel('claude-3-5-sonnet-20241022');
                else if (val === 'gemini') setModel('gemini-2.0-flash');
                else setModel('deterministic-ast');
              }}
              className="w-full bg-[#0d0e14] border border-white/10 rounded-lg p-2.5 text-neutral-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ollama">Ollama (100% Local, Private, Zero-Leak)</option>
              <option value="openai">OpenAI (GPT-4o / Compatible API)</option>
              <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
              <option value="gemini">Google Gemini (Gemini 2.0 Flash)</option>
              <option value="offline">Offline Deterministic (Static AST Only)</option>
            </select>
          </div>

          {/* Base URL (for Ollama or Custom Endpoint) */}
          {provider === 'ollama' && (
            <div>
              <label className="block text-neutral-300 font-medium mb-1.5 flex items-center space-x-1">
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                <span>Ollama Endpoint URL</span>
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full bg-[#0d0e14] border border-white/10 rounded-lg p-2.5 font-mono text-neutral-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* API Key (for cloud providers) */}
          {['openai', 'anthropic', 'gemini'].includes(provider) && (
            <div>
              <label className="block text-neutral-300 font-medium mb-1.5 flex items-center space-x-1">
                <Key className="w-3.5 h-3.5 text-indigo-400" />
                <span>Provider API Key</span>
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter API Key (sk-...)"
                className="w-full bg-[#0d0e14] border border-white/10 rounded-lg p-2.5 font-mono text-neutral-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Model Name */}
          {provider !== 'offline' && (
            <div>
              <label className="block text-neutral-300 font-medium mb-1.5">Model Name</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Model tag or ID"
                className="w-full bg-[#0d0e14] border border-white/10 rounded-lg p-2.5 font-mono text-neutral-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Temperature Slider */}
          {provider !== 'offline' && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-neutral-300 font-medium flex items-center space-x-1">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Review Strictness / Temperature</span>
                </label>
                <span className="font-mono text-neutral-400">{temperature}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>
          )}

          {/* Test Status feedback */}
          {testResult && (
            <div
              className={`p-3 rounded-lg border flex items-start space-x-2 text-xs ${
                testResult.ok
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-950/30 border-red-500/30 text-red-300'
              }`}
            >
              {testResult.ok ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[#0d0e14] border-t border-white/5 flex items-center justify-between">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="px-3 py-1.5 rounded-lg bg-[#181a26] hover:bg-white/10 text-neutral-300 text-xs font-medium border border-white/10 transition-colors"
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-neutral-400 hover:text-white text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
