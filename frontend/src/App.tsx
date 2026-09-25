import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ScenarioSelector } from './components/ScenarioSelector';
import { HexViewer } from './components/HexViewer';
import { FragmentStitcherWorkbench } from './components/FragmentStitcherWorkbench';
import { EvidenceTriage } from './components/EvidenceTriage';
import { ArtifactPreviewModal } from './components/ArtifactPreviewModal';
import { TechArchitectureModal } from './components/TechArchitectureModal';
import { CustomDataStudio } from './components/CustomDataStudio';
import type {
  ScenarioMeta,
  FragmentItem,
  StitchResult,
  RepairResult,
  TriageData,
  IntegrityData
} from './types';
import { Eye, ShieldCheck, Wrench, RotateCcw, ChevronDown, ChevronUp, FolderPlus } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE !== undefined
  ? import.meta.env.VITE_API_BASE
  : (typeof window !== 'undefined' && window.location.port === '5173' ? 'http://127.0.0.1:8000' : '');

export function App() {
  const [scenarios, setScenarios] = useState<ScenarioMeta[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string>('custom');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeCaseData, setActiveCaseData] = useState<any>(null);

  // Core Data States (starts completely EMPTY!)
  const [fragments, setFragments] = useState<FragmentItem[]>([]);
  const [stitchResult, setStitchResult] = useState<StitchResult | null>(null);
  const [repairResult, setRepairResult] = useState<RepairResult | null>(null);
  const [triage, setTriage] = useState<TriageData | null>(null);
  const [integrity, setIntegrity] = useState<IntegrityData | null>(null);

  // Custom File Store for header repair
  const [uploadedBase64, setUploadedBase64] = useState<string>('');

  // Modals & UI Toggles
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [isArchModalOpen, setIsArchModalOpen] = useState<boolean>(false);
  const [showPresetScenarios, setShowPresetScenarios] = useState<boolean>(false);

  useEffect(() => {
    fetchScenarios();
  }, []);

  const fetchScenarios = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/scenarios`);
      if (res.ok) {
        const data = await res.json();
        setScenarios(data);
      }
    } catch (e) {
      console.warn("Using fallback scenarios", e);
    }
  };

  // Reset to 100% Blank State
  const handleClearAll = () => {
    setActiveScenarioId('custom');
    setActiveCaseData(null);
    setFragments([]);
    setStitchResult(null);
    setRepairResult(null);
    setTriage(null);
    setIntegrity(null);
    setUploadedBase64('');
  };

  // User uploaded their own file
  const handleCustomFileUpload = async (file: File) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    // Read base64 reliably
    const b64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve((reader.result as string).split(',')[1] || '');
      };
      reader.readAsDataURL(file);
    });
    setUploadedBase64(b64);

    try {
      const res = await fetch(`${API_BASE}/api/scan-raw`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setActiveCaseData({
          scenario_id: 'custom_file',
          title: `Evidence File: ${file.name}`,
          description: `Size: ${file.size} bytes | Entropy: ${data.entropy} bits/byte | Category: ${data.classification?.category}`,
          corrupted_hex_preview: data.sector_map.blocks[0]?.hex_preview || ""
        });
        setActiveScenarioId('custom_file');
        setIntegrity(data.integrity || {
          confidence_score: 80.0,
          admissibility_status: data.classification?.category || "RAW DATA INGESTED",
          risk_level: "INSPECTION ACTIVE",
          hashes: data.hashes
        });

        // Run IOC triage if text
        if (data.classification?.type_code === 'TEXT_FORENSIC' || file.name.endsWith('.txt') || file.name.endsWith('.log')) {
          const textContent = await file.text();
          const tRes = await fetch(`${API_BASE}/api/triage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: textContent })
          });
          if (tRes.ok) {
            const tData = await tRes.json();
            setTriage(tData.entities);
          }
        }
      }
    } catch (e) {
      console.error("Custom upload scan failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  // User submitted custom fragments (pasted or uploaded)
  const handleCustomFragmentsSubmit = async (customFragments: FragmentItem[]) => {
    setIsLoading(true);
    setFragments(customFragments);
    setActiveScenarioId('custom_fragments');
    setActiveCaseData({
      scenario_id: 'custom_fragments',
      title: `Custom Fragment Puzzle (${customFragments.length} Chunks)`,
      description: "User-supplied fragmented evidence chunks undergoing AI continuity reassembly."
    });

    try {
      const res = await fetch(`${API_BASE}/api/stitch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fragments: customFragments })
      });
      if (res.ok) {
        const data = await res.json();
        setStitchResult(data.stitching);
        setTriage(data.triage);
        setIntegrity(data.integrity);
      }
    } catch (e) {
      console.error("Stitch failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  // User requested header repair on custom file
  const handleCustomRepairRequest = async (file: File, formatHint: string) => {
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = (reader.result as string).split(',')[1] || '';
      setUploadedBase64(b64);

      try {
        const res = await fetch(`${API_BASE}/api/repair`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_bytes_b64: b64,
            target_format: formatHint
          })
        });
        if (res.ok) {
          const data: RepairResult = await res.json();
          setRepairResult(data);
          setActiveScenarioId('custom_repair');
          // Extract raw hex preview from base64 so HexViewer has corrupted preview
          let rawHex = "";
          try {
            const binaryStr = atob(b64.slice(0, 500));
            rawHex = Array.from(binaryStr.slice(0, 128))
              .map(c => c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase())
              .join(' ');
          } catch {
            rawHex = "";
          }

          setActiveCaseData({
            scenario_id: 'custom_repair',
            title: `Repaired File: ${file.name} (${data.format})`,
            description: data.message,
            corrupted_hex_preview: rawHex
          });
          setIntegrity(data.integrity || {
            confidence_score: data.confidence_score,
            admissibility_status: data.admissibility_status,
            risk_level: "LOW RISK",
            hashes: data.repaired_hashes,
            evidence_hashes: data.corrupted_hashes
          });

          if (data.sqlite_extraction?.success) {
            const sqlText = JSON.stringify(data.sqlite_extraction.data);
            const tRes = await fetch(`${API_BASE}/api/triage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: sqlText })
            });
            if (tRes.ok) {
              const tData = await tRes.json();
              setTriage(tData.entities);
            }
          }
          setIsPreviewOpen(true);
        }
      } catch (e) {
        console.error("Custom repair failed", e);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Re-run stitch if on fragments
  const handleRunStitch = async () => {
    if (!fragments.length) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/stitch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fragments })
      });
      if (res.ok) {
        const data = await res.json();
        setStitchResult(data.stitching);
        setTriage(data.triage);
        setIntegrity(data.integrity);
        setIsPreviewOpen(true);
      }
    } catch (e) {
      console.error("Stitch failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger repair on currently active uploaded file or active scenario
  const handleRepairActiveFile = async (openModal: boolean = false) => {
    if (!uploadedBase64 && activeScenarioId !== 'case_2_broken_image' && activeScenarioId !== 'case_3_sqlite_ledger') return;
    setIsLoading(true);
    try {
      const payload: Record<string, string> = {};
      if (activeScenarioId === 'case_2_broken_image' || activeScenarioId === 'case_3_sqlite_ledger') {
        payload.scenario_id = activeScenarioId;
      } else if (uploadedBase64) {
        payload.file_bytes_b64 = uploadedBase64;
        payload.target_format = 'auto';
      }

      const res = await fetch(`${API_BASE}/api/repair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data: RepairResult = await res.json();
        setRepairResult(data);
        setActiveCaseData((prev: any) => ({
          ...prev,
          scenario_id: prev?.scenario_id || 'custom_repair',
          title: prev?.title ? (prev.title.startsWith('Repaired') ? prev.title : `Repaired: ${prev.title}`) : `Repaired File (${data.format})`,
          description: data.message,
          corrupted_hex_preview: prev?.corrupted_hex_preview || ""
        }));
        setIntegrity(data.integrity || {
          confidence_score: data.confidence_score,
          admissibility_status: data.admissibility_status,
          risk_level: "LOW RISK",
          hashes: data.repaired_hashes,
          evidence_hashes: data.corrupted_hashes
        });

        if (data.sqlite_extraction?.success) {
          const sqlText = JSON.stringify(data.sqlite_extraction.data);
          const tRes = await fetch(`${API_BASE}/api/triage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: sqlText })
          });
          if (tRes.ok) {
            const tData = await tRes.json();
            setTriage(tData.entities);
          }
        }
        if (openModal) {
          setIsPreviewOpen(true);
        }
      }
    } catch (e) {
      console.error("Repair failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Optional: Load preset scenario
  const handleLoadPresetScenario = async (id: string) => {
    setIsLoading(true);
    setActiveScenarioId(id);
    setStitchResult(null);
    setRepairResult(null);
    setTriage(null);
    setIntegrity(null);

    try {
      const res = await fetch(`${API_BASE}/api/scenarios/${id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveCaseData(data);
        if (id === 'case_1_fragmented_leaks') {
          setFragments(data.fragments);
        }
        if (data.corrupted_b64) {
          setUploadedBase64(data.corrupted_b64);
        }
        if (data.hashes) {
          setIntegrity({
            confidence_score: id === 'case_1_fragmented_leaks' ? 95.2 : 76.5,
            admissibility_status: id === 'case_1_fragmented_leaks' ? "SCATTERED CHUNKS INGESTED" : "RECOVERY CANDIDATE (Corrupted Header)",
            risk_level: "MODERATE RISK",
            hashes: data.hashes
          });
        }
      }
    } catch (e) {
      console.error("Failed to load scenario", e);
    } finally {
      setIsLoading(false);
    }
  };

  const previewCaseType =
    activeScenarioId === 'case_2_broken_image' ||
    (repairResult && (repairResult.format === 'PNG' || repairResult.format === 'JPEG' || !repairResult.sqlite_extraction))
      ? 'image'
      : activeScenarioId === 'case_3_sqlite_ledger' || (repairResult && repairResult.format === 'SQLite3')
      ? 'sqlite'
      : 'chat';

  const hasReconstruction = !!stitchResult || !!repairResult;
  const isCustomMode = activeScenarioId.startsWith('custom');

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-100 cyber-grid flex flex-col font-mono">
      {/* Top Navbar */}
      <Navbar
        onOpenArchitecture={() => setIsArchModalOpen(true)}
        activeCaseId={isCustomMode ? 'CUSTOM_INVESTIGATION' : activeScenarioId.toUpperCase()}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Workspace Action Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-violet-500/15 bg-[#0d0d1a]/80 backdrop-blur-xl shadow-[0_4px_30px_rgba(139,92,246,0.05)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-violet-950/60 border border-violet-500/30 text-violet-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 font-mono flex items-center gap-2">
                <span>{activeCaseData?.title || 'Blank Investigation Canvas (Ready for Your Data)'}</span>
                {isCustomMode && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#39ff14]/10 text-[#39ff14] border border-[#39ff14]/30">
                    EMPTY WORKSPACE
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                {activeCaseData?.description ||
                  'No pre-loaded data active. Upload your own files or paste custom fragments below to test the AI engines.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Reset / Clear Button */}
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 text-xs font-mono transition-colors cursor-pointer border border-slate-700/50"
              title="Clear all data and start a new blank investigation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear / Reset</span>
            </button>

            {/* Repair button if custom file has base64 or repairable scenario is active */}
            {((uploadedBase64 || activeScenarioId === 'case_2_broken_image' || activeScenarioId === 'case_3_sqlite_ledger') && !repairResult) && (
              <button
                onClick={() => handleRepairActiveFile(true)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-xs transition-all cursor-pointer font-mono shadow-lg shadow-violet-500/20"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Smart Repair Header</span>
              </button>
            )}

            {/* View Rendered Artifact */}
            {hasReconstruction && (
              <button
                onClick={() => setIsPreviewOpen(true)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#0d0d1a] hover:bg-violet-950/50 text-violet-300 font-semibold text-xs border border-violet-500/30 shadow-sm transition-all cursor-pointer font-mono"
              >
                <Eye className="w-4 h-4 text-violet-400" />
                <span>View Rendered Artifact</span>
              </button>
            )}
          </div>
        </div>

        {/* PRIMARY COMPONENT: CUSTOM DATA STUDIO (Empty & Ready for User's Data!) */}
        <CustomDataStudio
          onCustomFileUpload={handleCustomFileUpload}
          onCustomFragmentsSubmit={handleCustomFragmentsSubmit}
          onCustomRepairRequest={handleCustomRepairRequest}
          isLoading={isLoading}
        />

        {/* Fragment Stitcher Workbench (Active if user submitted fragments or in case 1) */}
        {(fragments.length > 0 || stitchResult) && (
          <FragmentStitcherWorkbench
            fragments={fragments}
            stitchResult={stitchResult}
            onRunStitch={handleRunStitch}
            isLoading={isLoading}
          />
        )}

        {/* Live Hex Viewer (Active if file is loaded or in repair) */}
        {(activeCaseData?.corrupted_hex_preview || repairResult || activeScenarioId === 'custom_file' || activeScenarioId === 'case_2_broken_image' || activeScenarioId === 'case_3_sqlite_ledger') && (
          <HexViewer
            corruptedHexPreview={activeCaseData?.corrupted_hex_preview}
            annotations={repairResult?.annotations}
            isRepaired={!!repairResult}
            onTriggerRepair={() => handleRepairActiveFile(false)}
            isLoading={isLoading}
          />
        )}

        {/* Evidence Triage & Integrity Score Dashboard */}
        {(triage || integrity) && <EvidenceTriage triage={triage} integrity={integrity} />}

        {/* Collapsible Preset Scenarios Section (Optional fallback) */}
        <div className="pt-4 border-t border-slate-700/40">
          <button
            onClick={() => setShowPresetScenarios(!showPresetScenarios)}
            className="flex items-center gap-2 text-xs font-mono text-slate-500 hover:text-violet-300 transition-colors cursor-pointer py-1"
          >
            <FolderPlus className="w-4 h-4 text-violet-400" />
            <span>Optional: Pre-loaded Deterministic Evidence Scenarios</span>
            {showPresetScenarios ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showPresetScenarios && (
            <div className="mt-3">
              <ScenarioSelector
                scenarios={scenarios}
                activeScenarioId={activeScenarioId}
                onSelectScenario={handleLoadPresetScenario}
                onCustomFileUpload={handleCustomFileUpload}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>
      </main>

      {/* Artifact Preview Modal */}
      <ArtifactPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        caseType={previewCaseType}
        repairResult={repairResult}
        stitchResult={stitchResult}
      />

      {/* Technical Architecture Presentation Deck */}
      <TechArchitectureModal
        isOpen={isArchModalOpen}
        onClose={() => setIsArchModalOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-violet-500/10 bg-[#0a0a0f] px-6 py-4 text-center text-xs font-mono text-slate-500">
        ForensiX-AI // RFC Container-Specification Synthesis &amp; Shannon Byte-Entropy Reconstruction Engine // Digital Forensic Integrity
      </footer>
    </div>
  );
}

export default App;
