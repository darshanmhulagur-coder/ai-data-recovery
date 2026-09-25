import React from 'react';
import { X, Download, Image as ImageIcon, MessageSquare, Database, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { RepairResult, StitchResult } from '../types';

interface ArtifactPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseType: 'image' | 'chat' | 'sqlite';
  repairResult: RepairResult | null;
  stitchResult: StitchResult | null;
}

export const ArtifactPreviewModal: React.FC<ArtifactPreviewModalProps> = ({
  isOpen,
  onClose,
  caseType,
  repairResult,
  stitchResult
}) => {
  if (!isOpen) return null;

  const downloadReport = () => {
    let reportContent = "";
    if (caseType === 'image' && repairResult) {
      reportContent = JSON.stringify(repairResult, null, 2);
    } else if (caseType === 'chat' && stitchResult) {
      reportContent = `FORENSIX-AI DIGITAL EVIDENCE REPORT\n` +
        `====================================\n` +
        `CONFIDENCE SCORE: ${stitchResult.confidence_score}%\n` +
        `REASSEMBLED FRAGMENT ORDER: ${stitchResult.reassembled_order.join(" -> ")}\n\n` +
        `RECONSTRUCTED TRANSCRIPT:\n` +
        `${stitchResult.reassembled_text}\n`;
    } else if (caseType === 'sqlite' && repairResult) {
      reportContent = JSON.stringify(repairResult.sqlite_extraction, null, 2);
    }

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ForensiX_Evidence_${caseType.toUpperCase()}_Report.txt`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-400">
              {caseType === 'image' ? (
                <ImageIcon className="w-5 h-5" />
              ) : caseType === 'chat' ? (
                <MessageSquare className="w-5 h-5" />
              ) : (
                <Database className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 font-mono flex items-center gap-2">
                <span>Recovered Evidence Artifact Preview</span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  RECONSTRUCTION SUCCESSFUL
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Native rendered representation of the repaired digital evidence.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {caseType === 'chat' && stitchResult && (
            <div className="space-y-3 font-mono">
              <div className="text-xs text-slate-400 flex items-center justify-between bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span>Reconstruction Order: {stitchResult.reassembled_order.join(" ➔ ")}</span>
                <span className="text-emerald-400 font-bold">{stitchResult.confidence_score}% Confidence</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3 text-xs leading-relaxed">
                {stitchResult.reassembled_text.split("\n").map((line, i) => {
                  const isAttacker = line.includes("[OPERATOR_SHADOW]");
                  const isVictim = line.includes("[TARGET_SEC_TEAM]");
                  return (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border ${
                        isAttacker
                          ? 'border-rose-900/50 bg-rose-950/20 text-rose-200'
                          : isVictim
                          ? 'border-cyan-900/50 bg-cyan-950/20 text-cyan-200'
                          : 'border-slate-800 bg-slate-900 text-slate-300'
                      }`}
                    >
                      {line}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {caseType === 'image' && repairResult && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span>Format: {repairResult.format} | Injected Bytes: {repairResult.bytes_injected}B</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Specification Checksum Verified
                </span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col items-center justify-center">
                <img
                  src={`data:image/png;base64,${repairResult.repaired_b64}`}
                  alt="Recovered Evidence"
                  className="max-h-80 rounded-lg border border-emerald-500/40 shadow-2xl object-contain bg-slate-950 p-1"
                />
                <div className="mt-3 flex items-center gap-3">
                  <a
                    href={`data:image/png;base64,${repairResult.repaired_b64}`}
                    download="reconstructed_evidence.png"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Recovered Image (.png)</span>
                  </a>
                </div>
                <p className="mt-2 text-[11px] font-mono text-slate-400 text-center">
                  {repairResult.message || "Image successfully reconstructed and rendered via specification container synthesis."}
                </p>
              </div>
            </div>
          )}

          {caseType === 'sqlite' && repairResult?.sqlite_extraction && (
            <div className="space-y-3 font-mono">
              <div className="text-xs text-slate-400 flex items-center justify-between bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span>Recovered Tables: {repairResult.sqlite_extraction.tables_found.join(", ")}</span>
                <span className="text-emerald-400 font-bold">100-Byte SQLite Header Injected</span>
              </div>

              {Object.entries(repairResult.sqlite_extraction.data).map(([tableName, tableData]) => (
                <div key={tableName} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
                  <h4 className="text-xs font-bold text-amber-400 uppercase">
                    Table: {tableName}
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                          {tableData.columns.map((col) => (
                            <th key={col} className="p-2 font-medium">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="border-b border-slate-900/60 hover:bg-slate-900/60">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="p-2 text-slate-300">
                                {String(cell)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-800 pt-4 mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            <span>Digital Chain of Custody Maintained</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadReport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Forensic Case Report</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
