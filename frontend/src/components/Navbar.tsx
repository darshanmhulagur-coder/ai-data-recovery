import React from 'react';
import { ShieldAlert, Cpu, BookOpen, CheckCircle2, Activity } from 'lucide-react';

interface NavbarProps {
  onOpenArchitecture: () => void;
  activeCaseId: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenArchitecture, activeCaseId }) => {
  return (
    <header className="sticky top-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-xl border-b border-violet-500/15 shadow-[0_4px_30px_rgba(139,92,246,0.06)]">
      {/* Neon accent stripe */}
      <div className="h-[2px] w-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-400" />

      <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-500/20">
            <ShieldAlert className="w-5 h-5 text-white" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#39ff14] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#39ff14]" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-fuchsia-300 to-green-400 bg-clip-text text-transparent glow-text">
                ForensiX-AI
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold tracking-wider uppercase rounded-full bg-violet-950/60 text-violet-300 border border-violet-500/30">
                v1.0 Pro
              </span>
            </div>
            <p className="text-[11px] text-violet-300 font-mono tracking-tight">
              Autonomous RFC Container Synthesis &amp; Shannon Byte-Entropy Reconstruction Engine
            </p>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3 text-xs font-mono">
          {/* Engine status */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0d0d1a] border border-slate-700/50">
            <Cpu className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-slate-500">ENGINE:</span>
            <span className="text-[#39ff14] flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3 h-3" /> ONLINE (5 ENGINES)
            </span>
          </div>

          {/* Live activity dot */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0d0d1a] border border-slate-700/50">
            <Activity className="w-3.5 h-3.5 text-[#39ff14] animate-pulse" />
            <span className="text-slate-500">LIVE</span>
          </div>

          {/* Case ID */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-950/40 border border-violet-500/20">
            <span className="text-slate-500">CASE ID:</span>
            <span className="text-violet-300 font-bold">{activeCaseId || 'UNASSIGNED'}</span>
          </div>

          {/* Architecture button */}
          <button
            onClick={onOpenArchitecture}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold shadow-lg shadow-violet-500/20 transition-all text-xs cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Model Architecture &amp; System Docs</span>
          </button>
        </div>
      </div>
    </header>
  );
};
