import React from 'react';
import { Puzzle, Image as ImageIcon, Database, Upload, ArrowRight, Zap } from 'lucide-react';
import type { ScenarioMeta } from '../types';

interface ScenarioSelectorProps {
  scenarios: ScenarioMeta[];
  activeScenarioId: string;
  onSelectScenario: (id: string) => void;
  onCustomFileUpload: (file: File) => void;
  isLoading: boolean;
}

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({
  scenarios,
  activeScenarioId,
  onSelectScenario,
  onCustomFileUpload,
  isLoading
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const getIcon = (id: string) => {
    switch (id) {
      case 'case_1_fragmented_leaks':
        return <Puzzle className="w-5 h-5 text-indigo-400" />;
      case 'case_2_broken_image':
        return <ImageIcon className="w-5 h-5 text-emerald-400" />;
      case 'case_3_sqlite_ledger':
        return <Database className="w-5 h-5 text-amber-400" />;
      default:
        return <Zap className="w-5 h-5 text-cyan-400" />;
    }
  };

  const getGradient = (id: string, active: boolean) => {
    if (active) {
      switch (id) {
        case 'case_1_fragmented_leaks':
          return 'border-indigo-500 bg-indigo-950/40 shadow-indigo-950/40 ring-1 ring-indigo-500/50';
        case 'case_2_broken_image':
          return 'border-emerald-500 bg-emerald-950/40 shadow-emerald-950/40 ring-1 ring-emerald-500/50';
        case 'case_3_sqlite_ledger':
          return 'border-amber-500 bg-amber-950/40 shadow-amber-950/40 ring-1 ring-amber-500/50';
        default:
          return 'border-cyan-500 bg-cyan-950/40';
      }
    }
    return 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span>
            Deterministic Live Demo Scenarios
          </h2>
          <p className="text-xs text-slate-400">
            One-click deterministic scenarios demonstrating automated forensic carving and evidence reconstruction capabilities.
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-medium rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5 text-cyan-400" />
          <span>Upload Custom File</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              onCustomFileUpload(e.target.files[0]);
            }
          }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {scenarios.map((sc) => {
          const isActive = activeScenarioId === sc.id;
          return (
            <div
              key={sc.id}
              onClick={() => !isLoading && onSelectScenario(sc.id)}
              className={`cursor-pointer rounded-xl p-4 border transition-all duration-200 relative overflow-hidden group shadow-lg ${getGradient(
                sc.id,
                isActive
              )}`}
            >
              {isActive && (
                <div className="absolute top-0 right-0 px-2.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider rounded-bl-lg bg-cyan-500 text-slate-950">
                  ACTIVE CASE
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                  {getIcon(sc.id)}
                </div>
                <div className="space-y-1 pr-6 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-slate-400 uppercase">
                      {sc.track}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                    {sc.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {sc.description}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono">
                <span className="text-emerald-400 truncate max-w-[80%]">
                  ★ {sc.highlight}
                </span>
                <span className="text-slate-500 group-hover:text-cyan-400 transition-colors">
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
