import io
import base64
import sqlite3
import tempfile
import os
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel

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
    version="1.0.0"
)

# Enable CORS for Vite frontend dev server and local network
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class StitchRequest(BaseModel):
    fragments: List[Dict[str, Any]]

class RepairRequest(BaseModel):
    file_bytes_b64: Optional[str] = None
    scenario_id: Optional[str] = None
    target_format: Optional[str] = "auto"

class TriageRequest(BaseModel):
    content: str
    is_structural_valid: Optional[bool] = True

@app.get("/api/status")
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

@app.get("/api/scenarios")
def list_scenarios():
    """Lists pre-loaded deterministic demo scenarios."""
    return get_all_scenarios()

@app.get("/api/scenarios/{scenario_id}")
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

@app.post("/api/scan-raw")
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

@app.post("/api/stitch")
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

@app.post("/api/repair")
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
        # Extract rows from repaired sqlite
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

@app.post("/api/triage")
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

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Mount frontend/dist if built
frontend_dist_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
if os.path.exists(frontend_dist_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist_path, "assets")), name="assets")

    @app.get("/")
    def serve_frontend_root():
        return FileResponse(os.path.join(frontend_dist_path, "index.html"))

    @app.get("/{full_path:path}")
    async def catch_all_frontend(full_path: str):
        file_path = os.path.join(frontend_dist_path, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist_path, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
