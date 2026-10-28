import React from 'react';
import { TaintTraceFinding } from '../types';
import { ShieldAlert, ArrowRight, Activity, Zap, CheckCircle2, AlertOctagon } from 'lucide-react';

interface TaintTracerTabProps {
  taintTraces?: TaintTraceFinding[];
}

export const TaintTracerTab: React.FC<TaintTracerTabProps> = ({ taintTraces = [] }) => {
  if (taintTraces.length === 0) {
    return (
      <div className="bg-[#12141c] rounded-xl border border-white/5 p-12 text-center flex flex-col items-center justify-center space-y-3">
        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        <h3 className="text-sm font-semibold text-white">No Tainted Call Flows Detected</h3>
        <p className="text-xs text-neutral-400 max-w-md">
          AST taint analysis verified that all modified function entry points terminate safely without propagating unsanitized parameters into critical sinks.
        </p>
      </div>
    );
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'high':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      default:
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-[#12141c] rounded-xl border border-white/5 p-5">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              AST Taint Propagation & Blast Radius Tracer
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Tracks data flow paths from untrusted function parameters directly into security-sensitive execution sinks.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-[#181a24] p-3 rounded-lg border border-white/5">
            <span className="text-[10px] font-mono text-neutral-400 uppercase block">Total Taint Trajectories</span>
            <span className="text-sm font-bold text-red-400">{taintTraces.length}</span>
          </div>
          <div className="bg-[#181a24] p-3 rounded-lg border border-white/5">
            <span className="text-[10px] font-mono text-neutral-400 uppercase block">Critical Sinks Reached</span>
            <span className="text-sm font-bold text-neutral-200">
              {new Set(taintTraces.map(t => t.sinkCall)).size} unique sink(s)
            </span>
          </div>
          <div className="bg-[#181a24] p-3 rounded-lg border border-white/5">
            <span className="text-[10px] font-mono text-neutral-400 uppercase block">Max Blast Radius</span>
            <span className="text-sm font-bold text-rose-300">
              {Math.max(...taintTraces.map(t => t.blastRadius))} downstream callers
            </span>
          </div>
        </div>
      </div>

      {/* Taint Traces List */}
      <div className="space-y-4">
        {taintTraces.map((trace, idx) => (
          <div key={idx} className="bg-[#12141c] rounded-xl border border-white/5 overflow-hidden">
            {/* Card Header */}
            <div className="bg-[#161822] px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/5">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span className="font-mono text-xs font-bold text-white">
                  {trace.entryFunction} → {trace.sinkCall}()
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold border ${getRiskColor(trace.risk)}`}>
                  {trace.risk}
                </span>
              </div>

              <div className="flex items-center space-x-2 text-xs font-mono">
                <span className="text-neutral-400">{trace.filePath}</span>
                <span className="px-2 py-0.5 rounded bg-white/5 text-neutral-300 border border-white/10 flex items-center space-x-1">
                  <Activity className="w-3 h-3 text-indigo-400" />
                  <span>Blast Radius: {trace.blastRadius}</span>
                </span>
              </div>
            </div>

            {/* Visual Call Chain Pipeline */}
            <div className="p-4 border-b border-white/5 bg-[#0e0f16]">
              <span className="text-[11px] font-mono text-neutral-400 uppercase block mb-3">
                Call Chain Trajectory
              </span>
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                {trace.callChain.map((step, sIdx) => {
                  const isFirst = sIdx === 0;
                  const isLast = sIdx === trace.callChain.length - 1;
                  return (
                    <React.Fragment key={sIdx}>
                      <div
                        className={`px-3 py-1.5 rounded-lg border flex items-center space-x-1.5 ${
                          isFirst
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            : isLast
                            ? 'bg-red-500/20 text-red-300 border-red-500/40 font-bold'
                            : 'bg-white/5 text-neutral-200 border-white/10'
                        }`}
                      >
                        {isFirst && <span className="text-[9px] uppercase px-1 rounded bg-amber-500/30 text-amber-200">Source</span>}
                        <span>{step}</span>
                        {isLast && <span className="text-[9px] uppercase px-1 rounded bg-red-500/40 text-red-200">Sink</span>}
                      </div>

                      {!isLast && (
                        <ArrowRight className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Description & Impact */}
            <div className="p-4 text-xs font-sans text-neutral-300 space-y-2">
              <p className="leading-relaxed">{trace.description}</p>
              <div className="bg-[#171926] p-3 rounded-lg border border-white/5 flex items-start space-x-2">
                <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-neutral-300">
                  <span className="font-semibold text-white">Recommended Sanitization Boundary: </span>
                  Validate or type-check input before invoking <code className="text-red-300 font-mono">{trace.sinkCall}()</code>, or wrap downstream calls inside a parameterized statement.
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
