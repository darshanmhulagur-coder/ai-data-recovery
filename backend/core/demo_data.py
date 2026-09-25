import io
import os
import sqlite3
import base64
from typing import Dict, Any, List
from PIL import Image, ImageDraw, ImageFont
from .triage import calculate_hashes

def get_fragmented_chat_scenario() -> Dict[str, Any]:
    """
    Case 1: The Fragmented Leaks.
    A 3-part criminal extortion log split into non-contiguous chunks and scrambled.
    """
    chunk_1 = (
        "[2026-09-24 14:02:10] [OPERATOR_SHADOW]: Breach confirmed on target cluster 192.168.10.45. Database credentials dumped: user=admin_db password=V0rt3x$SecurePass!99.\n"
        "[2026-09-24 14:02:45] [TARGET_SEC_TEAM]: Who is this? We are logging this unauthorized connection and notifying authorities."
    )
    
    chunk_2 = (
        "[2026-09-24 14:03:15] [OPERATOR_SHADOW]: Logging won't help. We have already exfiltrated 42GB of confidential financial records and customer telemetry.\n"
        "[2026-09-24 14:03:50] [OPERATOR_SHADOW]: Payment escrow wallet (Bitcoin): bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq. Ransom demand is 2.5 BTC within 48 hours."
    )

    chunk_3 = (
        "[2026-09-24 14:04:22] [TARGET_SEC_TEAM]: Can you provide cryptographic proof of file possession before we authorize transfer?\n"
        "[2026-09-24 14:04:58] [OPERATOR_SHADOW]: Sample decrypt key: sk-live-94a8f10283bd78a2e1094ba98c1192fa. Check verification proof at onion site: http://shadowleak7x49v2a1p9e0.onion/verify."
    )

    # Scrambled presentation: Chunk 3 -> Chunk 1 -> Chunk 2
    scrambled_fragments = [
        {
            "id": "FRAG_CLUSTER_0942",
            "name": "Cluster #942 (Sector 7,536)",
            "sector_offset": 7536,
            "content": chunk_3,
            "size_bytes": len(chunk_3.encode("utf-8")),
            "original_order": 3
        },
        {
            "id": "FRAG_CLUSTER_0104",
            "name": "Cluster #104 (Sector 832)",
            "sector_offset": 832,
            "content": chunk_1,
            "size_bytes": len(chunk_1.encode("utf-8")),
            "original_order": 1
        },
        {
            "id": "FRAG_CLUSTER_0512",
            "name": "Cluster #512 (Sector 4,096)",
            "sector_offset": 4096,
            "content": chunk_2,
            "size_bytes": len(chunk_2.encode("utf-8")),
            "original_order": 2
        }
    ]

    return {
        "scenario_id": "case_1_fragmented_leaks",
        "title": "Case 1: The Fragmented Threat Intel Leaks",
        "category": "Non-Contiguous Fragment Reassembly",
        "description": "Criminal negotiation and credential exfiltration chat log split across 3 non-contiguous disk sectors. Traditional tools cannot link them together.",
        "fragments": scrambled_fragments,
        "correct_sequence": ["FRAG_CLUSTER_0104", "FRAG_CLUSTER_0512", "FRAG_CLUSTER_0942"]
    }

def create_evidence_image_bytes() -> bytes:
    """Generates an authentic synthetic surveillance/forensic evidence PNG image."""
    width, height = 480, 320
    img = Image.new("RGBA", (width, height), color=(15, 23, 42, 255))
    draw = ImageDraw.Draw(img)

    # Cyber/Forensic grid background
    for x in range(0, width, 40):
        draw.line([(x, 0), (x, height)], fill=(30, 41, 59, 120), width=1)
    for y in range(0, height, 40):
        draw.line([(0, y), (width, y)], fill=(30, 41, 59, 120), width=1)

    # Border & Badges
    draw.rectangle([(10, 10), (width - 10, height - 10)], outline=(16, 185, 129, 255), width=2)
    draw.rectangle([(20, 20), (width - 20, 65)], fill=(30, 41, 59, 255), outline=(6, 182, 212, 255), width=1)
    
    # Text graphics
    draw.text((30, 28), "DIGITAL FORENSIC EVIDENCE ARTIFACT #8821", fill=(6, 182, 212, 255))
    draw.text((30, 45), "STATUS: RECOVERED FROM CARVED UNALLOCATED CLUSTERS", fill=(16, 185, 129, 255))

    # Surveillance mockup box
    draw.rectangle([(30, 85), (width - 30, height - 35)], fill=(15, 23, 42, 200), outline=(244, 63, 94, 255), width=1)
    draw.text((45, 105), "[SECURITY FEED 04 - METRO TERMINAL CCTV]", fill=(244, 63, 94, 255))
    draw.text((45, 135), "TARGET IDENTIFIED: Black Sedan (License KA-01-MJ-8821)", fill=(248, 250, 252, 255))
    draw.text((45, 160), "TIMESTAMP: 2026-09-24 14:01:44 UTC", fill=(148, 163, 184, 255))
    draw.text((45, 185), "SUSPECT: EXFILTRATING HARD DRIVE DOCK", fill=(251, 191, 36, 255))
    draw.text((45, 215), "GPS COORD: 12.9716 N, 77.5946 E (CENTRAL GATE 3)", fill=(56, 189, 248, 255))
    draw.text((45, 245), "HASH: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", fill=(100, 116, 139, 255))

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

def get_broken_image_scenario() -> Dict[str, Any]:
    """
    Case 2: The Broken Evidence Image.
    Surveillance evidence PNG where first 64 bytes were overwritten with null/noise.
    """
    valid_png_bytes = create_evidence_image_bytes()
    # Deliberately corrupt first 33 bytes (wipe PNG magic signature + IHDR chunk)
    corrupted_bytes = bytearray(valid_png_bytes)
    for i in range(min(33, len(corrupted_bytes))):
        corrupted_bytes[i] = 0x00

    corrupted_data = bytes(corrupted_bytes)

    return {
        "scenario_id": "case_2_broken_image",
        "title": "Case 2: Ransomware-Corrupted Surveillance Photo",
        "category": "Specification-Aware Header Repair",
        "description": "Critical surveillance evidence PNG where ransomware wiped the first 64 bytes (Header & IHDR chunk). Standard photo viewers crash.",
        "corrupted_hex_preview": " ".join(f"{b:02X}" for b in corrupted_data[:128]),
        "corrupted_b64": base64.b64encode(corrupted_data).decode("utf-8"),
        "raw_size": len(corrupted_data),
        "target_format": "PNG",
        "hashes": calculate_hashes(corrupted_data),
        "repaired_preview_width": 480,
        "repaired_preview_height": 320
    }

def create_corrupted_sqlite_database() -> bytes:
    """Generates an authentic in-memory SQLite database, exports bytes, and destroys the first 100 bytes."""
    mem_db = sqlite3.connect(":memory:")
    cursor = mem_db.cursor()
    cursor.execute("""
        CREATE TABLE illicit_transfers (
            tx_id INTEGER PRIMARY KEY,
            timestamp TEXT,
            sender_account TEXT,
            recipient_wallet TEXT,
            amount_usd REAL,
            status TEXT
        )
    """)
    records = [
        (101, "2026-09-24 13:45:12", "SHELL_CORP_PANAMA_89", "0x71C95911E9a5D330f4d6214322617271a35ac3e4", 450000.0, "COMPLETED_UNTRACED"),
        (102, "2026-09-24 13:58:30", "CYPRUS_HOLDINGS_LLC", "0x28C6c06298d514Db089934071355E5743bf21d60", 820000.0, "SPLIT_MIXER_ACTIVE"),
        (103, "2026-09-24 14:00:05", "OFFSHORE_VORTEX_LTD", "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq", 1250000.0, "PENDING_AUTHORIZATION")
    ]
    cursor.executemany("INSERT INTO illicit_transfers VALUES (?, ?, ?, ?, ?, ?)", records)
    mem_db.commit()

    # Dump database to bytes
    dump_bytes = bytearray()
    for line in mem_db.iterdump():
        dump_bytes.extend(line.encode("utf-8") + b"\n")

    # Also build binary SQLite file in memory
    import tempfile
    with tempfile.NamedTemporaryFile(delete=False, suffix=".sqlite") as tmp:
        tmp_name = tmp.name
    
    file_db = sqlite3.connect(tmp_name)
    cursor2 = file_db.cursor()
    cursor2.execute("""
        CREATE TABLE illicit_transfers (
            tx_id INTEGER PRIMARY KEY,
            timestamp TEXT,
            sender_account TEXT,
            recipient_wallet TEXT,
            amount_usd REAL,
            status TEXT
        )
    """)
    cursor2.executemany("INSERT INTO illicit_transfers VALUES (?, ?, ?, ?, ?, ?)", records)
    file_db.commit()
    file_db.close()

    with open(tmp_name, "rb") as f:
        raw_db_bytes = f.read()

    os.remove(tmp_name)

    # Corrupt first 100 bytes (zero out SQLite 3 header)
    corrupted_db = bytearray(raw_db_bytes)
    for i in range(min(100, len(corrupted_db))):
        corrupted_db[i] = 0x00

    return bytes(corrupted_db)

def get_corrupted_sqlite_scenario() -> Dict[str, Any]:
    """
    Case 3: Corrupted SQLite DB Ledger.
    Financial ledger database page where the SQLite header was wiped to destroy evidence.
    """
    corrupted_data = create_corrupted_sqlite_database()
    return {
        "scenario_id": "case_3_sqlite_ledger",
        "title": "Case 3: Damaged SQLite Financial Ledger",
        "category": "Database Carving & Header Rebuild",
        "description": "Database table storing money-laundering transactions where malicious actors zeroed the 100-byte SQLite header to prevent judicial analysis.",
        "corrupted_hex_preview": " ".join(f"{b:02X}" for b in corrupted_data[:128]),
        "corrupted_b64": base64.b64encode(corrupted_data).decode("utf-8"),
        "raw_size": len(corrupted_data),
        "target_format": "SQLite3",
        "hashes": calculate_hashes(corrupted_data)
    }

def get_all_scenarios() -> List[Dict[str, Any]]:
    """Returns summaries of all 3 demo scenarios."""
    return [
        {
            "id": "case_1_fragmented_leaks",
            "title": "The Fragmented Threat Leaks",
            "track": "Non-Contiguous Fragment Stitching",
            "difficulty": "Advanced",
            "highlight": "Solves scattered text puzzle using NLP & timestamp continuity",
            "description": "Ransom negotiation & credentials scattered across 3 clusters"
        },
        {
            "id": "case_2_broken_image",
            "title": "The Broken Surveillance Photo",
            "track": "Smart Header Repair & Render",
            "difficulty": "Critical",
            "highlight": "Regenerates PNG magic signature + IHDR chunk with valid CRC32",
            "description": "Crime-scene photo corrupted with null bytes restored to viewable image"
        },
        {
            "id": "case_3_sqlite_ledger",
            "title": "Damaged SQLite Ledger",
            "track": "Database B-Tree Carving",
            "difficulty": "High",
            "highlight": "Restores wiped SQLite 100B header to extract unallocated transactions",
            "description": "Deleted wire transfers and crypto mixer payouts recovered"
        }
    ]
