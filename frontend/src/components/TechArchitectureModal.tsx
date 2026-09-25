import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Award } from 'lucide-react';

interface TechArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TechArchitectureModal: React.FC<TechArchitectureModalProps> = ({ isOpen, onClose }) => {
  const [activeSlide, setActiveSlide] = useState<number>(0);

  if (!isOpen) return null;

  const slides = [
    {
      title: "1. Problem Breakdown: Why Traditional Carvers Fail",
      subtitle: "The Gap between Conventional Carving and Forensic Reconstruction",
      badge: "PROBLEM DEFINITION",
      content: (
        <div className="space-y-4 text-xs font-mono">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-xl border border-rose-900/60 bg-rose-950/20 space-y-2">
              <span className="text-rose-400 font-bold uppercase tracking-wider text-[11px]">
                ❌ Traditional Tools (PhotoRec, Scalpel, Recuva)
              </span>
              <ul className="space-y-2 text-slate-300 list-disc list-inside">
                <li><strong className="text-slate-100">Fragmentation Blindness:</strong> Assume sequential sectors. When files are split across 3 non-contiguous clusters, they recover corrupted partial files.</li>
                <li><strong className="text-slate-100">Header Dependence:</strong> Rely on rigid magic bytes. If the first 32 bytes are wiped by ransomware, recovery fails 100%.</li>
                <li><strong className="text-slate-100">Unorganized Noise Overload:</strong> Dump 2,000 unnamed files without triage, relationship mapping, or integrity scoring.</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl border border-emerald-900/60 bg-emerald-950/20 space-y-2">
              <span className="text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
                ✨ ForensiX-AI Intelligent Reconstruction
              </span>
              <ul className="space-y-2 text-slate-300 list-disc list-inside">
                <li><strong className="text-emerald-300">AI Fragment Stitcher:</strong> Solves the jigsaw puzzle using semantic n-gram embeddings and timestamp monotonicity.</li>
                <li><strong className="text-emerald-300">Smart Header Synthesizer:</strong> Reconstructs missing PNG/JPEG/SQLite headers and recalculates CRCs.</li>
                <li><strong className="text-emerald-300">Forensic IOC Triage:</strong> Automatically identifies passwords, wallets, and keys with a 0-100% Integrity Score.</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "2. End-to-End System Architecture",
      subtitle: "5-Stage Pipeline from Raw Corrupted Storage to Admissible Evidence",
      badge: "ARCHITECTURE",
      content: (
        <div className="space-y-3 font-mono text-xs">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-center">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-cyan-400 font-bold text-xs mb-1">STAGE 1</div>
              <div className="text-[11px] text-slate-200">Raw Ingestion</div>
              <div className="text-[10px] text-slate-400 mt-1">512B / 4KB Sector Slicing</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-cyan-400 font-bold text-xs mb-1">STAGE 2</div>
              <div className="text-[11px] text-slate-200">Entropy Profiling</div>
              <div className="text-[10px] text-slate-400 mt-1">Shannon H + BFH Classification</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-900 border border-indigo-500/40 bg-indigo-950/30">
              <div className="text-indigo-400 font-bold text-xs mb-1">STAGE 3</div>
              <div className="text-[11px] text-slate-200">AI Jigsaw Stitching</div>
              <div className="text-[10px] text-slate-400 mt-1">NLP Boundary Affinity Graph</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-900 border border-emerald-500/40 bg-emerald-950/30">
              <div className="text-emerald-400 font-bold text-xs mb-1">STAGE 4</div>
              <div className="text-[11px] text-slate-200">Header Synthesis</div>
              <div className="text-[10px] text-slate-400 mt-1">Spec Patching & CRC32 Calc</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-900 border border-rose-500/40 bg-rose-950/30">
              <div className="text-rose-400 font-bold text-xs mb-1">STAGE 5</div>
              <div className="text-[11px] text-slate-200">Forensic Triage</div>
              <div className="text-[10px] text-slate-400 mt-1">IOC Filtering & Integrity Score</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
            <strong className="text-cyan-300">Data Flow:</strong> Raw binary bytes are ingested bypassing OS file allocation tables. Shannon entropy and Byte Frequency Histograms categorize blocks even without headers. Orphaned text fragments are routed to the AI Continuity Engine, damaged media blocks to the Header Synthesizer, and outputs are triaged with cryptographic SHA-256 hashes.
          </div>
        </div>
      )
    },
    {
      title: "3. AI Fragment Stitcher: Mathematical & Algorithmic Formulation",
      subtitle: "How the Jigsaw Puzzle Solver Determines Fragment Adjacency",
      badge: "AI & ML MODELS",
      content: (
        <div className="space-y-3 font-mono text-xs">
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <div className="text-indigo-400 font-bold mb-1">Junction Continuity Affinity Function:</div>
            <p className="text-[11px] text-slate-300">
              Affinity(A ➔ B) = 0.40 + 0.35 * CosSim(TFIDF(tail_A), TFIDF(head_B)) + MonotonicityBonus(TS_A, TS_B) + SyntaxBoundaryScore(A, B)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
              <strong className="text-slate-200 block mb-1">1. TF-IDF N-Grams:</strong>
              <p className="text-[10px] text-slate-400">
                Extracts character 1-to-3 grams from the boundary tail of A and head of B to compute semantic vector similarity.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
              <strong className="text-slate-200 block mb-1">2. Monotonicity:</strong>
              <p className="text-[10px] text-slate-400">
                Verifies ISO timestamps progress forward in time; penalizes backward chronological orders.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
              <strong className="text-slate-200 block mb-1">3. Syntactic Seams:</strong>
              <p className="text-[10px] text-slate-400">
                Detects mid-sentence breaks, unclosed quotation marks, and dialog speaker turn-taking.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "4. Judges Pitch Script & Quick Answers (English & Kanglish)",
      subtitle: "Cheat-Sheet for Delivering an Impressive Presentation to Judges",
      badge: "JUDGES PRESENTATION",
      content: (
        <div className="space-y-3 font-mono text-xs">
          <div className="p-3.5 rounded-xl border border-cyan-900/60 bg-cyan-950/20">
            <span className="text-cyan-400 font-bold block mb-1">30-Second Elevator Pitch (English):</span>
            <p className="text-[11px] text-slate-300 leading-relaxed italic">
              "Judges, traditional data recovery tools only carve sequential files with intact headers. In real cyber incidents, ransomware corrupts headers and files are fragmented. ForensiX-AI is an intelligent forensic assistant that stitches non-contiguous fragments like a jigsaw puzzle using AI continuity models, reconstructs broken headers with specification-aware repair, and calculates a 0-100% integrity confidence score with digital chain of custody."
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-emerald-900/60 bg-emerald-950/20">
            <span className="text-emerald-400 font-bold block mb-1">Kanglish Version (Kannada + English):</span>
            <p className="text-[11px] text-slate-300 leading-relaxed italic">
              "Sir, normal tools file header nodi matra recover madatte. But header corrupt agidre athava file 3 sectors nalli scatter agidre avakke agalla. Namma system AI embeddings use madi scattered pieces na puzzle thara stitch madatte, damaged PNG/SQLite header na fix madatte, and file ge 95% Confidence score kottu critical evidence (passwords, wallets) na highlight madatte."
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-950/70 border border-cyan-500/40 text-cyan-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {slides[activeSlide].badge}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Slide {activeSlide + 1} of {slides.length}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-100 font-mono mt-1">
                {slides[activeSlide].title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          <p className="text-xs text-slate-400 font-mono mb-4">
            {slides[activeSlide].subtitle}
          </p>
          {slides[activeSlide].content}
        </div>

        <div className="border-t border-slate-800 pt-4 mt-4 flex items-center justify-between font-mono text-xs">
          <button
            onClick={() => setActiveSlide((prev) => Math.max(0, prev - 1))}
            disabled={activeSlide === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>

          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                  activeSlide === i ? 'w-6 bg-cyan-400' : 'bg-slate-700 hover:bg-slate-500'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => setActiveSlide((prev) => Math.min(slides.length - 1, prev + 1))}
            disabled={activeSlide === slides.length - 1}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-800/80 bg-cyan-950/70 text-cyan-300 hover:bg-cyan-900 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
