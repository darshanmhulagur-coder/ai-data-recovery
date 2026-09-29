import React, { useState } from 'react';
import { Upload, Plus, Trash2, FileText, Wrench, Sparkles, FolderUp, CheckCircle2, FileUp, RotateCcw, Download, FolderArchive, FileCode } from 'lucide-react';
import type { FragmentItem } from '../types';

const getApiBase = (): string => {
  if (typeof window === 'undefined') return '';
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const envBase = (import.meta.env.VITE_API_BASE as string | undefined)?.trim();

  // If in production on Vercel or any remote domain:
  if (!isLocalhost) {
    // If VITE_API_BASE was mistakenly configured with a localhost/127.0.0.1 URL, IGNORE it and use relative path
    if (!envBase || envBase.includes('localhost') || envBase.includes('127.0.0.1')) {
      return '';
    }
    return envBase.replace(/\/+$/, '');
  }

  // If in local development:
  if (envBase) return envBase.replace(/\/+$/, '');
  if (window.location.port === '5173') return 'http://127.0.0.1:8000';
  return '';
};

const API_BASE = getApiBase();

interface CustomDataStudioProps {
  onCustomFileUpload: (file: File) => void;
  onCustomFragmentsSubmit: (fragments: FragmentItem[]) => void;
  onCustomRepairRequest: (file: File, formatHint: string) => void;
  isLoading: boolean;
}

export const CustomDataStudio: React.FC<CustomDataStudioProps> = ({
  onCustomFileUpload,
  onCustomFragmentsSubmit,
  onCustomRepairRequest,
  isLoading
}) => {
  const [activeTab, setActiveTab] = useState<'upload_file' | 'custom_fragments' | 'header_repair'>('upload_file');

  // Fragment builder state (starts empty with 3 initial chunks ready)
  const [userFragments, setUserFragments] = useState<Array<{ id: string; name: string; content: string }>>([
    { id: 'CHUNK_A', name: 'Fragment #1', content: '' },
    { id: 'CHUNK_B', name: 'Fragment #2', content: '' },
    { id: 'CHUNK_C', name: 'Fragment #3', content: '' }
  ]);

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [repairFormat, setRepairFormat] = useState<string>('auto');

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const multiFileInputRef = React.useRef<HTMLInputElement>(null);
  const repairFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleLoadPreloadedEvidence = async (filename: string) => {
    try {
      let res = await fetch(`${API_BASE}/api/samples/${filename}`);
      if (!res.ok) {
        res = await fetch(`/samples/${filename}`);
      }
      if (res.ok) {
        const blob = await res.blob();
        const file = new File([blob], filename);
        setUploadedFile(file);
        onCustomFileUpload(file);
      }
    } catch (e) {
      console.error("Failed to load sample evidence", e);
    }
  };

  const handleLoadPreloadedRepair = async (filename: string, formatHint: string) => {
    try {
      let res = await fetch(`${API_BASE}/api/samples/${filename}`);
      if (!res.ok) {
        res = await fetch(`/samples/${filename}`);
      }
      if (res.ok) {
        const blob = await res.blob();
        const file = new File([blob], filename);
        onCustomRepairRequest(file, formatHint);
      }
    } catch (e) {
      console.error("Failed to load sample repair", e);
    }
  };

  const handleAddFragment = () => {
    const nextNum = userFragments.length + 1;
    setUserFragments([
      ...userFragments,
      {
        id: `CHUNK_${String.fromCharCode(65 + userFragments.length)}_${Date.now()}`,
        name: `Fragment #${nextNum}`,
        content: ''
      }
    ]);
  };

  const handleRemoveFragment = (index: number) => {
    if (userFragments.length <= 2) {
      alert("At least 2 fragments are required to test AI jigsaw stitching.");
      return;
    }
    setUserFragments(userFragments.filter((_, i) => i !== index));
  };

  const handleResetFragments = () => {
    setUserFragments([
      { id: 'CHUNK_A', name: 'Fragment #1', content: '' },
      { id: 'CHUNK_B', name: 'Fragment #2', content: '' },
      { id: 'CHUNK_C', name: 'Fragment #3', content: '' }
    ]);
  };

  const handleFragmentContentChange = (index: number, text: string) => {
    const updated = [...userFragments];
    updated[index].content = text;
    setUserFragments(updated);
  };

  // Upload single file for a specific chunk card
  const handleSingleChunkFileUpload = async (index: number, file: File) => {
    try {
      const text = await file.text();
      const updated = [...userFragments];
      updated[index] = {
        ...updated[index],
        name: file.name,
        content: text
      };
      setUserFragments(updated);
    } catch (err) {
      console.error("Failed to read chunk file", file.name, err);
    }
  };

  // Batch multi-file upload (appends or replaces empty chunks seamlessly)
  const processFilesList = async (files: File[]) => {
    if (!files || files.length === 0) return;

    const loadedChunks: Array<{ id: string; name: string; content: string }> = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const text = await files[i].text();
        loadedChunks.push({
          id: `CHUNK_${files[i].name.replace(/[^a-zA-Z0-9]/g, '_')}_${i + 1}`,
          name: files[i].name,
          content: text
        });
      } catch (err) {
        console.error("Error reading file", files[i].name, err);
      }
    }

    if (loadedChunks.length === 0) return;

    // Check if current fragments are only empty placeholders
    const hasExistingContent = userFragments.some((f) => f.content.trim().length > 0);

    if (!hasExistingContent) {
      // Directly populate the loaded files (e.g. 3 files become Chunk 1, 2, 3)
      setUserFragments(loadedChunks);
    } else {
      // Append new files so user can add chunks one by one or in batches!
      setUserFragments((prev) => [...prev, ...loadedChunks]);
    }
  };

  const handleMultiFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    await processFilesList(files);
    // Crucial: reset value so selecting the same or new files fires onChange reliably
    e.target.value = '';
  };

  const submitFragments = () => {
    const validFragments: FragmentItem[] = userFragments
      .filter((f) => f.content.trim().length > 0)
      .map((f, i) => ({
        id: f.id || `CHUNK_${i + 1}`,
        name: f.name || `Fragment #${i + 1}`,
        content: f.content,
        sector_offset: (i + 1) * 512,
        size_bytes: new Blob([f.content]).size
      }));

    if (validFragments.length < 2) {
      alert("Please provide content for at least 2 fragments (upload files or paste text) to test AI stitching!");
      return;
    }

    onCustomFragmentsSubmit(validFragments);
  };

  return (
    <div className="rounded-2xl border border-violet-500/15 bg-[#0d0d1a]/80 backdrop-blur-xl p-5 shadow-[0_4px_30px_rgba(139,92,246,0.05)] space-y-5">
      {/* Studio Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#39ff14] animate-pulse pulse-ring"></span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 font-mono">
              Empty Investigation Studio (Custom Data Testing)
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-950/60 text-violet-300 border border-violet-500/30">
              User Input Mode
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            No preloaded data. Choose a testing method below and provide your own raw files, fragmented text chunks, or corrupted headers.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-800/50 border border-slate-700/50 text-xs font-mono">
          <button
            onClick={() => setActiveTab('upload_file')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'upload_file'
                ? 'bg-violet-950/70 text-violet-300 border border-violet-500/40 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File / Disk Stream</span>
          </button>

          <button
            onClick={() => setActiveTab('custom_fragments')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'custom_fragments'
                ? 'bg-fuchsia-950/70 text-fuchsia-300 border border-fuchsia-500/40 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Paste / Upload Chunks</span>
          </button>

          <button
            onClick={() => setActiveTab('header_repair')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'header_repair'
                ? 'bg-[#39ff14]/10 text-[#39ff14] border border-[#39ff14]/30 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Corrupted Header Repair</span>
          </button>
        </div>
      </div>

      {/* TAB 1: UPLOAD ANY FILE / RAW DUMP */}
      {activeTab === 'upload_file' && (
        <div className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer border-2 border-dashed border-violet-500/25 hover:border-violet-400/60 rounded-2xl p-8 bg-violet-950/10 hover:bg-violet-950/25 transition-all flex flex-col items-center justify-center text-center space-y-3 group"
          >
            <div className="p-4 rounded-2xl bg-violet-950/50 border border-violet-500/30 text-violet-400 group-hover:scale-105 transition-transform">
              <Upload className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-200 font-mono">
                Click or Drop Your Evidence File Here
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Supports <strong className="text-violet-300">.png, .jpg, .db, .sqlite, .raw, .dd, .bin, .dat, .txt</strong> or any corrupted file.
              </p>
            </div>
            <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-[#12122a] text-slate-400 border border-slate-700/50">
              Bypasses OS file table & runs Shannon entropy + sector analysis
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                const f = e.target.files[0];
                setUploadedFile(f);
                onCustomFileUpload(f);
              }
            }}
          />

          {uploadedFile && (
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#12122a] border border-slate-700/50 font-mono text-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#39ff14]" />
                <span className="text-slate-100 font-bold">{uploadedFile.name}</span>
                <span className="text-slate-500">({(uploadedFile.size / 1024).toFixed(1)} KB)</span>
              </div>
              <button
                onClick={() => onCustomFileUpload(uploadedFile)}
                disabled={isLoading}
                className="px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                {isLoading ? 'Scanning...' : 'Re-scan File'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PASTE / ENTER / BATCH UPLOAD CUSTOM FRAGMENTS */}
      {activeTab === 'custom_fragments' && (
        <div className="space-y-4">
          {/* Multi-file drag & drop / selector banner */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={async (e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                await processFilesList(Array.from(e.dataTransfer.files));
              }
            }}
            onClick={() => multiFileInputRef.current?.click()}
            className="border-2 border-dashed border-fuchsia-500/25 hover:border-fuchsia-400/60 rounded-xl p-4 bg-fuchsia-950/10 hover:bg-fuchsia-950/20 transition-all flex flex-wrap items-center justify-between gap-3 cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-fuchsia-950/50 border border-fuchsia-500/30 text-fuchsia-400 group-hover:scale-105 transition-transform">
                <FolderUp className="w-6 h-6 text-fuchsia-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200 font-mono">
                  Click to Browse or Drag & Drop 2, 3, or More Chunk Files Here
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Select all 3 files together (Ctrl+A), or add files one-by-one. Each file auto-creates a chunk card!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono px-3 py-1.5 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-semibold shadow-md transition-colors">
                Choose 3+ Files (.txt, .log)
              </span>
            </div>
          </div>

          <input
            ref={multiFileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleMultiFileInputChange}
          />

          {/* Action bar for chunks */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400 border-b border-slate-700/40 pb-2">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-500"></span>
              <span>
                Active Chunks ({userFragments.length}):{' '}
                <strong className="text-slate-200">
                  {userFragments.filter((f) => f.content.trim().length > 0).length} Ready
                </strong>
              </span>
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetFragments}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-700/50 bg-slate-800/40 hover:bg-slate-700/40 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer text-[11px]"
                title="Reset to 3 empty chunks"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Chunks</span>
              </button>

              <button
                onClick={handleAddFragment}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-fuchsia-500/30 bg-fuchsia-950/40 hover:bg-fuchsia-950/60 text-fuchsia-300 transition-colors cursor-pointer text-[11px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Another Chunk</span>
              </button>
            </div>
          </div>

          {/* Grid of Fragment Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {userFragments.map((frag, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-700/40 bg-[#12122a] p-3.5 space-y-2 relative group hover:border-violet-500/40 transition-all flex flex-col justify-between shadow-sm"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-violet-950/60 border border-violet-500/30 text-violet-300 text-[11px] font-mono font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={frag.name}
                        onChange={(e) => {
                          const copy = [...userFragments];
                          copy[idx].name = e.target.value;
                          setUserFragments(copy);
                        }}
                        className="bg-transparent border-b border-transparent focus:border-violet-500 font-mono text-xs font-bold text-slate-100 outline-none px-1 w-32 truncate"
                        title={frag.name}
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Individual file upload for this specific chunk */}
                      <label
                        className="p-1 text-slate-500 hover:text-violet-400 cursor-pointer transition-colors"
                        title={`Upload file for Chunk #${idx + 1}`}
                      >
                        <FileUp className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleSingleChunkFileUpload(idx, e.target.files[0]);
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>

                      {userFragments.length > 2 && (
                        <button
                          onClick={() => handleRemoveFragment(idx)}
                          className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer transition-colors"
                          title="Remove chunk"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <textarea
                    rows={5}
                    value={frag.content}
                    placeholder={`Paste text or upload file for chunk #${idx + 1}...`}
                    onChange={(e) => handleFragmentContentChange(idx, e.target.value)}
                    className="w-full rounded-lg bg-[#08081a] border border-violet-500/10 p-2.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500/40 resize-none leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-700/30">
                  <span>Size: {new Blob([frag.content]).size} B</span>
                  {frag.content.trim().length > 0 ? (
                    <span className="text-[#39ff14] flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> Ready
                    </span>
                  ) : (
                    <span className="text-slate-600">Empty</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-mono text-slate-500">
              💡 Tip: Click <strong>"Choose 3+ Files"</strong> above to load all 3 chunks at once, or use the 📁 icon on each card.
            </span>

            <button
              onClick={submitFragments}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-500 hover:to-fuchsia-400 text-white font-semibold text-xs shadow-lg shadow-violet-500/20 font-mono transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Solving Puzzle...' : 'Run AI Jigsaw Stitcher On My Data'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: CORRUPTED HEADER REPAIR */}
      {activeTab === 'header_repair' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#0a0a0f] border border-slate-700/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-200 font-bold">
                Select Target File Specification to Reconstruct:
              </span>
              <select
                value={repairFormat}
                onChange={(e) => setRepairFormat(e.target.value)}
                className="bg-[#08081a] border border-violet-500/20 text-xs font-mono text-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-violet-500/40"
              >
                <option value="auto">Auto-Detect Format</option>
                <option value="png">PNG Image (8-byte Magic + IHDR CRC32)</option>
                <option value="jpeg">JPEG Image (SOI 0xFFD8 + JFIF APP0)</option>
                <option value="sqlite3">SQLite 3 Database (100-byte DB Header)</option>
              </select>
            </div>

            <div
              onClick={() => repairFileInputRef.current?.click()}
              className="cursor-pointer border border-dashed border-slate-700/50 hover:border-[#39ff14]/50 rounded-xl p-6 bg-[#08081a] hover:bg-[#0d1a0d]/30 transition-all flex flex-col items-center justify-center text-center space-y-2"
            >
              <Wrench className="w-6 h-6 text-[#39ff14]" />
              <p className="text-xs font-bold text-slate-200 font-mono">
                Click to Select Corrupted File (.bin, .png, .jpg, .db)
              </p>
              <p className="text-[11px] text-slate-500">
                The engine will detect payload streams, synthesize valid headers, recalculate CRCs, and render/export the repaired file.
              </p>
            </div>
            <input
              ref={repairFileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  onCustomRepairRequest(e.target.files[0], repairFormat);
                }
              }}
            />

            {/* Sample Corrupted Header Files Download & Repair Bar */}
            <div className="rounded-xl border border-emerald-500/20 bg-[#0d0d1a]/90 p-4 space-y-3 mt-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/40 pb-2.5">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-[#39ff14]" />
                  <span className="text-xs font-bold text-slate-200 font-mono">
                    Sample Corrupted Header Files for AI Reconstruction:
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 text-[#39ff14] border border-emerald-500/30 font-mono">
                    3 Specifications Available
                  </span>
                </div>
                <a
                  href={`${API_BASE}/api/download-all-samples`}
                  download="ForensiX_Evidence_Samples.zip"
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 text-[#39ff14] border border-emerald-500/30 text-[11px] font-mono transition-colors"
                >
                  <FolderArchive className="w-3.5 h-3.5" />
                  <span>Download All (.ZIP)</span>
                </a>
              </div>

              <p className="text-[11px] text-slate-400 font-mono">
                Click <strong>"Download"</strong> to save the raw damaged file, or click <strong>"Repair Directly"</strong> to synthesize headers and preview the restored artifact immediately:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Header Sample 0: Minimal Corruption PNG (Only 8 Magic Bytes Wiped) */}
                <div className="p-3.5 rounded-lg bg-[#12122a] border border-slate-700/40 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400 font-mono truncate" title="minimal_corrupted_evidence.png">
                        minimal_corrupted.png
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono font-semibold">8 BYTES WIPED</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Only 8 PNG magic bytes zeroed. 99.9% payload intact. AI patches the 8 bytes and resurrects the photo.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={`${API_BASE}/api/samples/minimal_corrupted_evidence.png`}
                      download="minimal_corrupted_evidence.png"
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono transition-colors"
                    >
                      <Download className="w-3 h-3 text-[#39ff14]" />
                      <span>Download</span>
                    </a>
                    <button
                      onClick={() => handleLoadPreloadedRepair('minimal_corrupted_evidence.png', 'png')}
                      disabled={isLoading}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-[11px] font-mono font-semibold transition-all cursor-pointer"
                    >
                      <Wrench className="w-3 h-3" />
                      <span>Repair</span>
                    </button>
                  </div>
                </div>

                {/* Header Sample 1: PNG */}
                <div className="p-3.5 rounded-lg bg-[#12122a] border border-slate-700/40 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#39ff14] font-mono truncate" title="broken_surveillance_photo.bin">
                        broken_surveillance_photo.bin
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono font-semibold">PNG SPEC</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      PNG magic signature &amp; 25-byte IHDR chunk wiped with zeros. AI regenerates valid RFC 2083 container + CRC32.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={`${API_BASE}/api/samples/broken_surveillance_photo.bin`}
                      download="broken_surveillance_photo.bin"
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono transition-colors"
                    >
                      <Download className="w-3 h-3 text-[#39ff14]" />
                      <span>Download</span>
                    </a>
                    <button
                      onClick={() => handleLoadPreloadedRepair('broken_surveillance_photo.bin', 'png')}
                      disabled={isLoading}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-[11px] font-mono font-semibold transition-all cursor-pointer"
                    >
                      <Wrench className="w-3 h-3" />
                      <span>Repair</span>
                    </button>
                  </div>
                </div>

                {/* Header Sample 2: JPEG */}
                <div className="p-3.5 rounded-lg bg-[#12122a] border border-slate-700/40 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#39ff14] font-mono truncate" title="corrupted_traffic_camera.bin">
                        corrupted_traffic_camera.bin
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono font-semibold">JPEG SPEC</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      JPEG SOI marker wiped + illegal 0x00 quantization table values. AI patches baseline quantization &amp; JFIF header.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={`${API_BASE}/api/samples/corrupted_traffic_camera.bin`}
                      download="corrupted_traffic_camera.bin"
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono transition-colors"
                    >
                      <Download className="w-3 h-3 text-[#39ff14]" />
                      <span>Download</span>
                    </a>
                    <button
                      onClick={() => handleLoadPreloadedRepair('corrupted_traffic_camera.bin', 'jpeg')}
                      disabled={isLoading}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-[11px] font-mono font-semibold transition-all cursor-pointer"
                    >
                      <Wrench className="w-3 h-3" />
                      <span>Repair</span>
                    </button>
                  </div>
                </div>

                {/* Header Sample 3: SQLite */}
                <div className="p-3.5 rounded-lg bg-[#12122a] border border-slate-700/40 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#39ff14] font-mono truncate" title="corrupted_ledger.db">
                        corrupted_ledger.db
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono font-semibold">SQLITE SPEC</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      100-byte SQLite v3 header destroyed with null bytes. AI reconstructs schema cookie, page size &amp; parses tables.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={`${API_BASE}/api/samples/corrupted_ledger.db`}
                      download="corrupted_ledger.db"
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono transition-colors"
                    >
                      <Download className="w-3 h-3 text-[#39ff14]" />
                      <span>Download</span>
                    </a>
                    <button
                      onClick={() => handleLoadPreloadedRepair('corrupted_ledger.db', 'sqlite3')}
                      disabled={isLoading}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-[11px] font-mono font-semibold transition-all cursor-pointer"
                    >
                      <Wrench className="w-3 h-3" />
                      <span>Repair</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
