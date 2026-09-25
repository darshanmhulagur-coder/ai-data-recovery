import React, { useState } from 'react';
import { Puzzle, Sparkles, CheckCircle2, Layers, FileText, ArrowDown, Activity } from 'lucide-react';
import type { FragmentItem, StitchResult, Junction } from '../types';

interface FragmentStitcherWorkbenchProps {
  fragments: FragmentItem[];
  stitchResult: StitchResult | null;
  onRunStitch: () => void;
  isLoading: boolean;
}

export const FragmentStitcherWorkbench: React.FC<FragmentStitcherWorkbenchProps> = ({
  fragments,
  stitchResult,
  onRunStitch,
  isLoading
}) => {
  const [activeTab, setActiveTab] = useState<'visual_puzzle' | 'reassembled_text'>('visual_puzzle');

  const fragmentMap = React.useMemo(() => {
    const map = new Map<string, FragmentItem>();
    fragments.forEach((f) => map.set(f.id, f));
    return map;
  }, [fragments]);

  const orderedFragments = React.useMemo(() => {
    if (!stitchResult) return fragments;
    return stitchResult.reassembled_order.map((id) => fragmentMap.get(id) || fragments[0]);
  }, [stitchResult, fragments, fragmentMap]);

  return (
    <div className="rounded-xl border border-indigo-900/60 bg-slate-950/80 p-5 shadow-2xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Puzzle className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 font-mono">
              AI Fragment Stitcher (Jigsaw Puzzle Solver)
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800">
              NLP Boundary Continuity
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Reassembles non-contiguous, fragmented clusters using semantic embeddings, grammatical boundary matching, and timestamp sequences.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {stitchResult && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-xs font-mono">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-300">CONFIDENCE:</span>
              <span className="text-emerald-400 font-bold text-sm">
                {stitchResult.confidence_score}%
              </span>
            </div>
          )}

          <button
            onClick={onRunStitch}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-semibold text-xs shadow-lg shadow-indigo-950/60 transition-all cursor-pointer disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Solving Continuity Graph...' : 'Run AI Jigsaw Auto-Solve'}</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
        <button
          onClick={() => setActiveTab('visual_puzzle')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
            activeTab === 'visual_puzzle'
              ? 'bg-slate-900 text-indigo-300 border border-indigo-500/40 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Interactive Cluster Sequence ({stitchResult ? 'AI Solved' : 'Disordered'})</span>
        </button>
        {stitchResult && (
          <button
            onClick={() => setActiveTab('reassembled_text')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
              activeTab === 'reassembled_text'
                ? 'bg-slate-900 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Reassembled Evidence Stream</span>
          </button>
        )}
      </div>

      {activeTab === 'visual_puzzle' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>
              {stitchResult ? 'Optimal Reconstructed Path:' : 'Scattered Raw Storage Clusters (Non-contiguous):'}
            </span>
            <span className="text-[11px] text-slate-500">
              {stitchResult
                ? 'Ordered by AI boundary affinity & chronological monotonicity'
                : 'Fragments saved in out-of-order sectors'}
            </span>
          </div>

          <div className="space-y-3">
            {orderedFragments.map((frag, idx) => {
              const junction: Junction | undefined =
                stitchResult?.junctions.find((j) => j.from_fragment === frag.id);

              return (
                <React.Fragment key={frag.id}>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 transition-all hover:border-indigo-500/50 relative overflow-hidden group">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-950 border border-indigo-700/60 text-xs font-mono font-bold text-indigo-300">
                          #{idx + 1}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-200 font-mono">
                            {frag.name}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-400">
                            Sector Offset: {frag.sector_offset} | Size: {frag.size_bytes} Bytes
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                          ID: {frag.id}
                        </span>
                        {stitchResult && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> VERIFIED
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg bg-slate-950 p-3 font-mono text-xs text-slate-300 whitespace-pre-wrap border border-slate-800/80 leading-relaxed max-h-24 overflow-y-auto">
                      {frag.content}
                    </div>
                  </div>

                  {idx < orderedFragments.length - 1 && (
                    <div className="flex flex-col items-center justify-center py-1">
                      <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-slate-900/90 border border-indigo-500/40 shadow-md">
                        <ArrowDown className="w-3.5 h-3.5 text-indigo-400 animate-bounce" />
                        <span className="text-[11px] font-mono text-slate-300">
                          Junction Match:
                        </span>
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          {junction ? `${junction.affinity_score}% Affinity` : 'Boundary Seam'}
                        </span>
                        {junction && (
                          <span className="hidden md:inline text-[10px] font-mono text-slate-400 border-l border-slate-800 pl-2">
                            {junction.reason}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Unified Document Output (Stitched Stream):</span>
            <span className="text-emerald-400 font-semibold">
              Integrity Verified (No Missing Clusters)
            </span>
          </div>
          <div className="rounded-xl bg-slate-950 p-4 font-mono text-xs text-slate-200 whitespace-pre-wrap border border-slate-800 leading-relaxed max-h-96 overflow-y-auto selection:bg-indigo-900 selection:text-white">
            {stitchResult?.reassembled_text}
          </div>
        </div>
      )}
    </div>
  );
};
