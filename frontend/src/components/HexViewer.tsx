import React, { useState, useEffect } from 'react';
import { Binary, Sparkles, Wrench, CheckCircle2 } from 'lucide-react';
import type { ByteAnnotation } from '../types';

interface HexViewerProps {
  corruptedHexPreview?: string;
  annotations?: ByteAnnotation[];
  isRepaired?: boolean;
  onTriggerRepair?: () => void;
  isLoading?: boolean;
}

// Standard specification headers for instant predictive preview before backend response
const PNG_SPEC_HEADER = [
  "89", "50", "4E", "47", "0D", "0A", "1A", "0A", // PNG Magic Signature
  "00", "00", "00", "0D", // IHDR chunk length (13)
  "49", "48", "44", "52", // IHDR Chunk Type
  "00", "00", "01", "E0", // Width: 480
  "00", "00", "01", "40", // Height: 320
  "08", "06", "00", "00", "00", // 8-bit RGBA
  "6D", "90", "96", "16"  // CRC32 Checksum
];

export const HexViewer: React.FC<HexViewerProps> = ({
  corruptedHexPreview = "",
  annotations = [],
  isRepaired = false,
  onTriggerRepair,
  isLoading = false
}) => {
  const [viewMode, setViewMode] = useState<'annotated' | 'raw'>(
    isRepaired || annotations.length > 0 ? 'annotated' : 'raw'
  );
  const [hoveredByte, setHoveredByte] = useState<ByteAnnotation | null>(null);

  // Synchronize viewMode whenever isRepaired or annotations updates
  useEffect(() => {
    if (isRepaired || (annotations && annotations.length > 0)) {
      setViewMode('annotated');
    }
  }, [isRepaired, annotations]);

  // Handle switching to AI Repaired Diff: if repair hasn't run yet, trigger it immediately
  const handleSwitchToDiff = () => {
    setViewMode('annotated');
    if (!isRepaired && annotations.length === 0 && onTriggerRepair) {
      onTriggerRepair();
    }
  };

  // Build display bytes:
  // 1. If backend annotations exist, use them directly
  // 2. Otherwise build from corruptedHexPreview, providing predictive diff when in annotated mode
  const rawHexTokens = corruptedHexPreview.trim()
    ? corruptedHexPreview.trim().split(/\s+/).slice(0, 128)
    : [];

  const displayBytes: ByteAnnotation[] = annotations.length > 0
    ? annotations.slice(0, 128)
    : rawHexTokens.map((hex, i) => {
        const isCorrupt = hex === "00" || hex === "CC";
        // If in annotated view without backend annotations yet, synthesize spec header preview
        const repVal = (viewMode === 'annotated' && i < PNG_SPEC_HEADER.length && isCorrupt)
          ? PNG_SPEC_HEADER[i]
          : hex;
        const isFixed = isCorrupt && repVal !== hex;

        return {
          offset: i,
          orig_byte: hex,
          rep_byte: repVal,
          status: isFixed ? "repaired" : isCorrupt ? "corrupted" : "normal",
          label: isFixed
            ? "Synthesized Specification Header"
            : isCorrupt
            ? "Overwritten / Damaged Sector"
            : "Original Payload Stream"
        };
      });

  // Calculate diff metrics
  const repairedCount = displayBytes.filter(b => b.status === 'repaired').length;
  const damagedCount = displayBytes.filter(b => b.orig_byte === '00' || b.orig_byte === 'CC').length;

  // Group bytes into 16-byte lines
  const lines: ByteAnnotation[][] = [];
  for (let i = 0; i < displayBytes.length; i += 16) {
    lines.push(displayBytes.slice(i, i + 16));
  }

  const getByteColorClass = (item: ByteAnnotation) => {
    if (viewMode === 'raw') {
      if (item.orig_byte === '00' || item.orig_byte === 'CC') {
        return 'text-rose-400 bg-rose-950/60 border border-rose-800/80 font-bold';
      }
      return 'text-slate-300 hover:bg-slate-800/80 border border-transparent';
    }

    // Annotated (Diff) Mode
    if (item.status === 'repaired') {
      return 'text-[#39ff14] bg-[#39ff14]/10 border border-[#39ff14]/40 font-bold shadow-[0_0_8px_rgba(57,255,20,0.25)]';
    }
    if (item.status === 'corrupted' || item.orig_byte === '00' || item.orig_byte === 'CC') {
      return 'text-rose-400 bg-rose-950/50 border border-rose-800/60';
    }
    return 'text-slate-300 hover:bg-slate-800/80 border border-transparent';
  };

  return (
    <div className="rounded-xl border border-violet-500/15 bg-[#0d0d1a]/80 backdrop-blur-xl p-4 font-mono shadow-[0_4px_30px_rgba(139,92,246,0.05)] space-y-3">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/40 pb-3">
        <div className="flex items-center gap-2">
          <Binary className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Sector Byte Inspection (Hex &amp; ASCII Dump)
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/60 border border-slate-700/50 text-slate-400">
            Offset 0x0000 - 0x0080 (128 Bytes)
          </span>

          {/* Mode status badge */}
          {viewMode === 'annotated' ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#39ff14]/10 border border-[#39ff14]/30 text-[#39ff14] font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#39ff14]" />
              <span>AI DIFF: {repairedCount} Bytes Injected</span>
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950/50 border border-rose-500/30 text-rose-300 font-medium">
              RAW DAMAGED VIEW ({damagedCount} Nulls)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          {/* Quick trigger button if repair has not run yet */}
          {onTriggerRepair && !isRepaired && (
            <button
              onClick={onTriggerRepair}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-gradient-to-r from-violet-600 to-[#39ff14]/80 hover:from-violet-500 hover:to-[#39ff14]/70 text-white font-semibold text-[11px] transition-all cursor-pointer font-mono disabled:opacity-60 shadow-sm"
              title="Run AI Header Repair to synthesize specification header and show diff"
            >
              <Wrench className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Repairing...' : 'Run AI Repair'}</span>
            </button>
          )}

          {/* View mode toggle */}
          <div className="flex items-center rounded-lg bg-slate-800/50 border border-slate-700/50 p-0.5">
            <button
              onClick={() => setViewMode('raw')}
              className={`px-3 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                viewMode === 'raw'
                  ? 'bg-rose-950/70 text-rose-300 font-semibold border border-rose-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Damaged Raw
            </button>
            <button
              onClick={handleSwitchToDiff}
              className={`px-3 py-1 rounded text-[11px] transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'annotated'
                  ? 'bg-[#39ff14]/10 text-[#39ff14] font-semibold border border-[#39ff14]/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>AI Repaired Diff</span>
              {repairedCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-[#39ff14] animate-pulse"></span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Pre-repair guidance banner */}
      {!isRepaired && annotations.length === 0 && onTriggerRepair && (
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#39ff14]/5 border border-[#39ff14]/20 text-[#39ff14] text-xs font-mono">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#39ff14] shrink-0" />
            <span>
              Damaged null sector detected. Switch to <strong>"AI Repaired Diff"</strong> or click <strong>Run AI Repair</strong> to synthesize valid specification headers.
            </span>
          </div>
          <button
            onClick={onTriggerRepair}
            disabled={isLoading}
            className="shrink-0 ml-3 px-3 py-1 rounded bg-[#39ff14]/20 hover:bg-[#39ff14]/30 text-[#39ff14] font-bold text-[11px] cursor-pointer transition-all flex items-center gap-1.5 border border-[#39ff14]/30"
          >
            <Wrench className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Repairing...' : 'Run AI Repair'}</span>
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-slate-500 border-b border-slate-700/30 pb-2">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-[#39ff14] border border-[#39ff14]/60"></span>
          <span className="text-[#39ff14]/80 font-medium">Repaired / Injected Specification Header</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-rose-500 border border-rose-400"></span>
          <span className="text-rose-400/80 font-medium">Corrupted / Overwritten Nulls</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-slate-500"></span>
          <span>Intact Payload Stream</span>
        </span>
      </div>

      {/* Hex Grid Table — terminal panel stays dark for readability */}
      <div className="overflow-x-auto select-none terminal-panel p-3 scanline">
        <table className="w-full text-xs leading-relaxed border-collapse">
          <thead>
            <tr className="text-slate-500 text-[10px] border-b border-slate-700/40">
              <th className="text-left font-normal py-1 pr-4">OFFSET</th>
              <th className="text-left font-normal py-1 pr-4">
                00 01 02 03 04 05 06 07 &nbsp; 08 09 0A 0B 0C 0D 0E 0F
              </th>
              <th className="text-left font-normal py-1 pl-4">ASCII DECODE</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, lineIdx) => {
              const lineOffset = (lineIdx * 16).toString(16).padStart(8, '0').toUpperCase();
              return (
                <tr key={lineIdx} className="hover:bg-violet-950/20 transition-colors">
                  <td className="text-violet-400/70 font-semibold pr-4 py-0.5 whitespace-nowrap">
                    {lineOffset}
                  </td>
                  <td className="pr-4 py-0.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {line.slice(0, 8).map((b) => {
                        const byteVal = viewMode === 'raw' ? b.orig_byte : b.rep_byte;
                        return (
                          <span
                            key={b.offset}
                            onMouseEnter={() => setHoveredByte(b)}
                            onMouseLeave={() => setHoveredByte(null)}
                            className={`px-1 py-0.5 rounded cursor-crosshair transition-all ${getByteColorClass(b)}`}
                          >
                            {byteVal}
                          </span>
                        );
                      })}
                      <span className="text-slate-700 px-0.5">|</span>
                      {line.slice(8, 16).map((b) => {
                        const byteVal = viewMode === 'raw' ? b.orig_byte : b.rep_byte;
                        return (
                          <span
                            key={b.offset}
                            onMouseEnter={() => setHoveredByte(b)}
                            onMouseLeave={() => setHoveredByte(null)}
                            className={`px-1 py-0.5 rounded cursor-crosshair transition-all ${getByteColorClass(b)}`}
                          >
                            {byteVal}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="text-slate-500 pl-4 py-0.5 whitespace-nowrap border-l border-slate-800 font-mono">
                    {line.map((b) => {
                      const byteHex = viewMode === 'raw' ? b.orig_byte : b.rep_byte;
                      const byteInt = parseInt(byteHex, 16);
                      const char = byteInt >= 32 && byteInt <= 126 ? String.fromCharCode(byteInt) : '.';
                      const isRep = b.status === 'repaired' && viewMode === 'annotated';
                      const isCorrupt = (b.orig_byte === '00' || b.orig_byte === 'CC') && viewMode === 'raw';
                      return (
                        <span
                          key={b.offset}
                          className={
                            isRep
                              ? 'text-[#39ff14] font-bold bg-[#39ff14]/10 px-0.5 rounded'
                              : isCorrupt
                              ? 'text-rose-500/60'
                              : 'text-slate-500'
                          }
                        >
                          {char}
                        </span>
                      );
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Hover Inspector Tooltip Bar */}
      <div className="min-h-[30px] rounded-lg bg-[#12122a] border border-slate-700/40 px-3 py-1.5 flex items-center justify-between text-[11px] text-slate-400">
        {hoveredByte ? (
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-violet-400">
              Offset: 0x{hoveredByte.offset.toString(16).toUpperCase().padStart(4, '0')} ({hoveredByte.offset}d)
            </span>
            <span>
              Raw Hex: <strong className="text-rose-400">0x{hoveredByte.orig_byte}</strong>
            </span>
            <span>
              Repaired Hex: <strong className="text-[#39ff14]">0x{hoveredByte.rep_byte}</strong>
            </span>
            <span>
              Diff:{' '}
              {hoveredByte.status === 'repaired' ? (
                <strong className="text-[#39ff14] flex-inline items-center gap-1">
                  ✨ REPAIRED (0x{hoveredByte.orig_byte} → 0x{hoveredByte.rep_byte})
                </strong>
              ) : hoveredByte.orig_byte === '00' || hoveredByte.orig_byte === 'CC' ? (
                <strong className="text-rose-400">❌ DAMAGED NULL</strong>
              ) : (
                <strong className="text-slate-500">✔ INTACT PAYLOAD</strong>
              )}
            </span>
            <span className="text-slate-500">
              Category: <em className="text-slate-300">{hoveredByte.label}</em>
            </span>
          </div>
        ) : (
          <span className="text-slate-500 italic">
            Hover over any byte to inspect offset, hexadecimal value, and forensic classification.
          </span>
        )}
      </div>
    </div>
  );
};
