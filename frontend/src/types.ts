export interface FragmentItem {
  id: string;
  name: string;
  sector_offset: number;
  content: string;
  size_bytes: number;
  original_order?: number;
}

export interface Junction {
  from_fragment: string;
  to_fragment: string;
  affinity_score: number;
  reason: string;
}

export interface StitchResult {
  reassembled_order: string[];
  confidence_score: number;
  junctions: Junction[];
  reassembled_text: string;
  explanation: string;
}

export interface ForensicEntity {
  type: string;
  value: string;
  severity: "CRITICAL" | "CONTEXT" | "NOISE";
  tag: string;
}

export interface TriageData {
  critical: ForensicEntity[];
  context: ForensicEntity[];
  noise: ForensicEntity[];
}

export interface IntegrityData {
  confidence_score: number;
  admissibility_status: string;
  risk_level: string;
  hashes?: {
    sha256?: string;
    md5?: string;
    sha1?: string;
  };
  evidence_hashes?: {
    sha256?: string;
    md5?: string;
    sha1?: string;
  };
  model_summary?: string;
}

export interface ByteAnnotation {
  offset: number;
  orig_byte: string;
  rep_byte: string;
  status: "repaired" | "corrupted" | "normal";
  label: string;
}

export interface RepairResult {
  format: string;
  is_valid: boolean;
  message: string;
  bytes_injected: number;
  corrupted_size: number;
  repaired_size: number;
  confidence_score: number;
  admissibility_status: string;
  annotations: ByteAnnotation[];
  repaired_b64: string;
  corrupted_hashes?: { sha256: string; md5: string };
  repaired_hashes?: { sha256: string; md5: string };
  sqlite_extraction?: {
    success: boolean;
    tables_found: string[];
    data: Record<string, { columns: string[]; rows: any[][] }>;
  };
  integrity?: IntegrityData;
}

export interface ScenarioMeta {
  id: string;
  title: string;
  track: string;
  difficulty: string;
  highlight: string;
  description: string;
}
