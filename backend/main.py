import io
import base64
import sqlite3
import tempfile
import os
import zipfile
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, FileResponse
from pydantic import BaseModel
from PIL import Image, ImageDraw

from core.carver import calculate_shannon_entropy, calculate_byte_frequency_histogram, classify_block, analyze_stream_sectors
from core.stitcher import solve_fragment_puzzle
from core.header_repair import auto_detect_and_repair, repair_png_header, repair_jpeg_header, repair_sqlite_header
from core.triage import (
    extract_forensic_entities,
    calculate_integrity_score,
    calculate_hashes,
    calculate_raw_evidence_integrity,
    calculate_repaired_file_integrity
)
from core.demo_data import (
    get_all_scenarios,
    get_fragmented_chat_scenario,
    get_broken_image_scenario,
    get_corrupted_sqlite_scenario,
    create_evidence_image_bytes
)

app = FastAPI(
    title="ForensiX-AI API",
    description="Intelligent Forensic Carving & Evidence Reconstruction Engine",
    version="1.0.0",
    redirect_slashes=False
)

# Standard compliant CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"]
)

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class StitchRequest(BaseModel):
    fragments: List[Dict[str, Any]]

class RepairRequest(BaseModel):
    file_bytes_b64: Optional[str] = None
    scenario_id: Optional[str] = None
    target_format: Optional[str] = "auto"

class TriageRequest(BaseModel):
    content: str
    is_structural_valid: Optional[bool] = True

router = APIRouter()

@router.get("/status")
@router.get("/health")
def get_system_status():
    return {
        "status": "ONLINE",
        "engine": "ForensiX-AI Core v1.0",
        "active_modules": [
            "Shannon Entropy & BFH Profiler",
            "Statistical Byte Classifier",
            "AI Jigsaw Fragment Solver (N-Gram & TF-IDF)",
            "Specification-Aware Header Repair (PNG/JPEG/SQLite)",
            "Forensic IOC Triage & Chain-of-Custody Hasher"
        ],
        "engine_architecture": "Autonomous RFC Container Synthesis & Shannon Byte-Entropy Reconstruction",
        "ready_for_demo": True
    }

@router.get("/scenarios")
@router.get("/demo-scenarios")
def list_scenarios():
    """Lists pre-loaded deterministic demo scenarios."""
    return get_all_scenarios()

@router.get("/scenarios/{scenario_id}")
def load_scenario(scenario_id: str):
    """Fetches full payload for a specific demo scenario."""
    if scenario_id == "case_1_fragmented_leaks":
        return get_fragmented_chat_scenario()
    elif scenario_id == "case_2_broken_image":
        return get_broken_image_scenario()
    elif scenario_id == "case_3_sqlite_ledger":
        return get_corrupted_sqlite_scenario()
    else:
        raise HTTPException(status_code=404, detail="Scenario not found")

@router.post("/scan-raw")
@router.post("/analyze-stream")
async def scan_raw_evidence(
    file: Optional[UploadFile] = File(None),
    raw_b64: Optional[str] = Form(None)
):
    """
    Ingests raw damaged disk chunk or file, computes entropy distribution,
    slices into sector blocks, and returns classification report.
    """
    if file:
        data = await file.read()
    elif raw_b64:
        clean_b64 = raw_b64.replace(" ", "+")
        missing_padding = len(clean_b64) % 4
        if missing_padding:
            clean_b64 += "=" * (4 - missing_padding)
        data = base64.b64decode(clean_b64)
    else:
        raise HTTPException(status_code=400, detail="Provide either a file upload or raw_b64 data.")

    sector_analysis = analyze_stream_sectors(data, block_size=1024 if len(data) < 8192 else 4096)
    classification = classify_block(data)
    bfh = calculate_byte_frequency_histogram(data)
    hashes = calculate_hashes(data)
    integrity = calculate_raw_evidence_integrity(data, classification, bfh)

    return {
        "file_size_bytes": len(data),
        "entropy": classification["entropy"],
        "classification": classification,
        "bfh_summary": {
            "printable_ratio": bfh["printable_ratio"],
            "null_ratio": bfh["null_ratio"],
            "high_byte_ratio": bfh["high_byte_ratio"],
            "unique_bytes": bfh["unique_bytes"]
        },
        "hashes": hashes,
        "integrity": integrity,
        "sector_map": sector_analysis
    }

@router.post("/stitch")
@router.post("/stitch-fragments")
def stitch_fragments(req: StitchRequest):
    """
    Takes an array of disordered / non-contiguous text fragments,
    determines boundary affinity using NLP embeddings and syntactic constraints,
    and returns reassembled sequence with per-junction reasoning.
    """
    if not req.fragments:
        raise HTTPException(status_code=400, detail="Fragment array cannot be empty")

    puzzle_result = solve_fragment_puzzle(req.fragments)
    
    # Run triage on the reassembled text
    triage_result = extract_forensic_entities(puzzle_result["reassembled_text"])
    total_entities = len(triage_result["critical"]) + len(triage_result["context"])
    integrity = calculate_integrity_score(
        puzzle_result["reassembled_text"].encode("utf-8"),
        is_structural_valid=True,
        entity_count=total_entities
    )

    return {
        "stitching": puzzle_result,
        "triage": triage_result,
        "integrity": integrity
    }

@router.post("/repair")
@router.post("/repair-header")
def repair_header(req: RepairRequest):
    """
    Identifies corrupted file format, injects specification-compliant headers,
    recalculates checksums/CRCs, and returns repaired base64 artifact with hex annotations.
    """
    if req.scenario_id == "case_2_broken_image":
        scenario = get_broken_image_scenario()
        corrupted_bytes = base64.b64decode(scenario["corrupted_b64"])
        repaired_bytes, meta = repair_png_header(corrupted_bytes, 480, 320)
    elif req.scenario_id == "case_3_sqlite_ledger":
        scenario = get_corrupted_sqlite_scenario()
        corrupted_bytes = base64.b64decode(scenario["corrupted_b64"])
        repaired_bytes, meta = repair_sqlite_header(corrupted_bytes)
    elif req.file_bytes_b64:
        clean_b64 = req.file_bytes_b64.replace(" ", "+")
        missing_padding = len(clean_b64) % 4
        if missing_padding:
            clean_b64 += "=" * (4 - missing_padding)
        corrupted_bytes = base64.b64decode(clean_b64)
        repaired_bytes, meta = auto_detect_and_repair(corrupted_bytes, req.target_format or "")
    else:
        raise HTTPException(status_code=400, detail="Provide scenario_id or file_bytes_b64")

    # Generate integrity score and cryptographic chain-of-custody hashes for the repaired file
    integrity = calculate_repaired_file_integrity(
        repaired_bytes,
        corrupted_bytes,
        is_structural_valid=meta.get("is_valid", True),
        format_name=meta.get("format", "File"),
        bytes_injected=meta.get("bytes_injected", 0)
    )
    corrupted_hashes = calculate_hashes(corrupted_bytes)

    # For text/SQLite or extracted entities
    triage_info = None
    if meta.get("format") == "SQLite3":
        triage_info = extract_sqlite_records(repaired_bytes)

    return {
        "format": meta.get("format", "Unknown"),
        "is_valid": meta.get("is_valid", False),
        "message": meta.get("message", "Processed"),
        "bytes_injected": meta.get("bytes_injected", 0),
        "corrupted_size": len(corrupted_bytes),
        "repaired_size": len(repaired_bytes),
        "corrupted_hashes": corrupted_hashes,
        "repaired_hashes": integrity["hashes"],
        "confidence_score": integrity["confidence_score"],
        "admissibility_status": integrity["admissibility_status"],
        "annotations": meta.get("annotations", []),
        "repaired_b64": base64.b64encode(repaired_bytes).decode("utf-8"),
        "sqlite_extraction": triage_info,
        "integrity": integrity
    }

def extract_sqlite_records(db_bytes: bytes) -> Dict[str, Any]:
    """Helper to parse records from repaired SQLite binary stream."""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".db") as tmp:
            tmp.write(db_bytes)
            tmp_path = tmp.name

        conn = sqlite3.connect(tmp_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [r[0] for r in cursor.fetchall()]

        extracted_tables = {}
        for table in tables:
            cursor.execute(f"PRAGMA table_info({table});")
            cols = [c[1] for c in cursor.fetchall()]
            cursor.execute(f"SELECT * FROM {table};")
            rows = cursor.fetchall()
            extracted_tables[table] = {
                "columns": cols,
                "rows": rows
            }
        conn.close()
        os.remove(tmp_path)
        return {
            "success": True,
            "tables_found": tables,
            "data": extracted_tables
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@router.post("/triage")
def triage_content(req: TriageRequest):
    """Runs IOC extraction and calculates forensic integrity score on text content."""
    entities = extract_forensic_entities(req.content)
    total_entities = len(entities["critical"]) + len(entities["context"])
    integrity = calculate_integrity_score(
        req.content.encode("utf-8"),
        is_structural_valid=req.is_structural_valid,
        entity_count=total_entities
    )
    return {
        "entities": entities,
        "integrity": integrity
    }

def get_sample_bytes(filename: str) -> Optional[bytes]:
    """
    Resolves sample evidence bytes from filesystem or dynamically generates
    them in memory. Guarantees samples always exist in serverless environments.
    """
    safe_name = os.path.basename(filename)

    # 1. Search candidate locations on disk
    candidates = [
        os.path.join(ROOT_DIR, safe_name),
        os.path.join(ROOT_DIR, "sample_fragments", safe_name),
        os.path.join(ROOT_DIR, "frontend", "public", "samples", safe_name),
        os.path.join(ROOT_DIR, "frontend", "dist", "samples", safe_name),
        os.path.join(os.getcwd(), safe_name),
        os.path.join(os.getcwd(), "sample_fragments", safe_name),
        os.path.join(os.getcwd(), "frontend", "public", "samples", safe_name),
        os.path.join(os.getcwd(), "frontend", "dist", "samples", safe_name),
    ]
    for path in candidates:
        if os.path.exists(path) and os.path.isfile(path):
            try:
                with open(path, "rb") as f:
                    return f.read()
            except Exception:
                pass

    # 2. Dynamic in-memory generator fallback for Vercel/serverless environments
    if "minimal_corrupted" in safe_name:
        # Minimal 8-byte magic header wiped PNG
        raw_png = create_evidence_image_bytes()
        arr = bytearray(raw_png)
        for i in range(min(8, len(arr))):
            arr[i] = 0x00
        return bytes(arr)

    elif "broken_surveillance" in safe_name or "missing_header" in safe_name:
        # 33-byte header & IHDR chunk wiped PNG
        raw_png = create_evidence_image_bytes()
        arr = bytearray(raw_png)
        for i in range(min(33, len(arr))):
            arr[i] = 0x00
        return bytes(arr)

    elif "clean_reference" in safe_name:
        return create_evidence_image_bytes()

    elif "ledger" in safe_name or "sqlite" in safe_name.lower():
        scenario = get_corrupted_sqlite_scenario()
        return base64.b64decode(scenario["corrupted_b64"])

    elif "traffic_camera" in safe_name:
        try:
            im = Image.new("RGB", (480, 320), color=(20, 30, 48))
            draw = ImageDraw.Draw(im)
            draw.rectangle([(20, 20), (460, 300)], fill=(30, 41, 59), outline=(244, 63, 94))
            draw.text((40, 50), "[TRAFFIC CAM #402 - RED LIGHT INFRACTION]", fill=(244, 63, 94))
            draw.text((40, 80), "TIMESTAMP: 2026-09-24 14:02:11", fill=(255, 255, 255))
            buf = io.BytesIO()
            im.save(buf, format="JPEG", quality=85)
            jpg_bytes = bytearray(buf.getvalue())
            for i in range(min(16, len(jpg_bytes))):
                jpg_bytes[i] = 0x00
            return bytes(jpg_bytes)
        except Exception:
            return b"\x00" * 512

    elif "evidence_disk_stream" in safe_name:
        png_sample = create_evidence_image_bytes()[:1024]
        chat_sample = (
            b"[2026-09-24 14:00:01] SECTOR DUMP: THREAT_INTEL_STREAM\n"
            b"IP: 198.51.100.45 PORT: 4444 STATUS: COMPROMISED\n"
        )
        return (chat_sample * 8)[:2048] + png_sample + (b"\x00" * 1024)

    elif "dvr_capture" in safe_name:
        return b"\x00" * 64 + b"H264_STREAM_CARVED_METRIC_DATA" * 100

    elif safe_name.startswith("chunk_1"):
        return (
            "[2026-09-24 14:00:12] [OPERATOR_SHADOW]: Establishing persistence across cluster 0x8F...\n"
            "[2026-09-24 14:01:45] [TARGET_SEC_TEAM]: Warning: Unauthorized memory dump detected on DB-PRIMARY-01."
        ).encode("utf-8")

    elif safe_name.startswith("chunk_2"):
        return (
            "[2026-09-24 14:03:15] [OPERATOR_SHADOW]: Logging won't help. We have already exfiltrated 42GB of confidential financial records and customer telemetry.\n"
            "[2026-09-24 14:03:50] [OPERATOR_SHADOW]: Payment escrow wallet (Bitcoin): bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq. Ransom demand is 2.5 BTC within 48 hours."
        ).encode("utf-8")

    elif safe_name.startswith("chunk_3"):
        return (
            "[2026-09-24 14:04:22] [TARGET_SEC_TEAM]: Can you provide cryptographic proof of file possession before we authorize transfer?\n"
            "[2026-09-24 14:04:58] [OPERATOR_SHADOW]: Sample decrypt key: sk-live-94a8f10283bd78a2e1094ba98c1192fa. Check verification proof at onion site: http://shadowleak7x49v2a1p9e0.onion/verify."
        ).encode("utf-8")

    return None

@router.get("/samples/{filename}")
def download_sample_file(filename: str):
    """Allows investigators to download sample corrupted/raw evidence files."""
    data = get_sample_bytes(filename)
    if data is None:
        raise HTTPException(status_code=404, detail="Sample evidence file not found")
    safe_name = os.path.basename(filename)
    return Response(
        content=data,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}"'}
    )

@router.get("/download-all-samples")
def download_all_samples():
    """Generates an in-memory zip archive with all evidence samples for 1-click download."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zipf:
        sample_files = [
            "minimal_corrupted_evidence.png",
            "evidence_disk_stream.raw",
            "corrupted_dvr_capture.bin",
            "broken_surveillance_photo.bin",
            "corrupted_ledger.db",
            "corrupted_traffic_camera.bin"
        ]
        for f in sample_files:
            content = get_sample_bytes(f)
            if content:
                zipf.writestr(f"1_Upload_File_Disk_Stream/{f}", content)
                zipf.writestr(f"2_Corrupted_Header_Repair/{f}", content)

        fragments = [
            "chunk_1_breach.txt",
            "chunk_2_ransom.txt",
            "chunk_3_decrypt_onion.txt"
        ]
        for f in fragments:
            content = get_sample_bytes(f)
            if content:
                zipf.writestr(f"3_Fragment_Chunks/{f}", content)

    buf.seek(0)
    return Response(
        content=buf.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="ForensiX_Evidence_Samples.zip"'}
    )

# Include API router with BOTH /api prefix AND root prefix to handle any Vercel rewrite variation
app.include_router(router, prefix="/api")
app.include_router(router)

# Mount frontend/dist if built (for local standalone server execution)
frontend_dist_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
if os.path.exists(frontend_dist_path):
    assets_dir = os.path.join(frontend_dist_path, "assets")
    if os.path.exists(assets_dir):
        from fastapi.staticfiles import StaticFiles
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    def serve_frontend_root():
        return FileResponse(os.path.join(frontend_dist_path, "index.html"))

    @app.get("/{full_path:path}")
    async def catch_all_frontend(full_path: str):
        # Never return HTML for API requests
        if full_path.startswith("api/") or full_path == "api":
            raise HTTPException(status_code=404, detail=f"API endpoint /{full_path} not found")
        file_path = os.path.join(frontend_dist_path, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist_path, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
