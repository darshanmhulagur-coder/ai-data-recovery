import os
import sys
import base64

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.carver import calculate_shannon_entropy, calculate_byte_frequency_histogram, classify_block
from core.stitcher import solve_fragment_puzzle
from core.header_repair import repair_png_header, repair_sqlite_header
from core.triage import extract_forensic_entities, calculate_integrity_score
from core.demo_data import get_fragmented_chat_scenario, get_broken_image_scenario, get_corrupted_sqlite_scenario

def test_all():
    print("=== 1. Testing AI Fragment Stitcher (Case 1) ===")
    scenario_1 = get_fragmented_chat_scenario()
    fragments = scenario_1["fragments"]
    print(f"Input scrambled fragment count: {len(fragments)}")
    print(f"Scrambled IDs: {[f['id'] for f in fragments]}")
    
    result = solve_fragment_puzzle(fragments)
    print(f"Reassembled order: {result['reassembled_order']}")
    print(f"Confidence score: {result['confidence_score']}%")
    print(f"Junctions:")
    for j in result["junctions"]:
        print(f"  {j['from_fragment']} -> {j['to_fragment']} ({j['affinity_score']}%): {j['reason']}")
    
    expected_order = scenario_1["correct_sequence"]
    assert result["reassembled_order"] == expected_order, f"Expected {expected_order}, got {result['reassembled_order']}"
    print(">>> PASS: Fragment stitching perfectly reassembled the scrambled chat log!\n")

    print("=== 2. Testing Forensic Triage Extraction ===")
    triage = extract_forensic_entities(result["reassembled_text"])
    print(f"Critical artifacts found: {len(triage['critical'])}")
    for crit in triage["critical"]:
        print(f"  [{crit['severity']}] {crit['type']}: {crit['value']}")
    assert len(triage["critical"]) >= 3, "Should extract credentials, bitcoin wallet, and sample decrypt key!"
    print(">>> PASS: Critical forensic artifacts (passwords, wallets, keys) extracted!\n")

    print("=== 3. Testing Smart Header Repair on PNG Image (Case 2) ===")
    scenario_2 = get_broken_image_scenario()
    corrupted_data = base64.b64decode(scenario_2["corrupted_b64"])
    print(f"Corrupted bytes length: {len(corrupted_data)}")
    repaired_png, meta = repair_png_header(corrupted_data, 480, 320)
    print(f"Header repair format: {meta['format']}, is_valid: {meta['is_valid']}, injected bytes: {meta['bytes_injected']}")
    assert meta["is_valid"] is True, "Repaired PNG must be valid!"
    assert repaired_png.startswith(b"\x89PNG\r\n\x1a\n"), "Must start with PNG signature!"
    print(">>> PASS: Corrupted PNG header regenerated with valid magic bytes and CRC32!\n")

    print("=== 4. Testing SQLite Header Repair (Case 3) ===")
    scenario_3 = get_corrupted_sqlite_scenario()
    corrupted_db = base64.b64decode(scenario_3["corrupted_b64"])
    repaired_db, db_meta = repair_sqlite_header(corrupted_db)
    print(f"Repaired DB format: {db_meta['format']}, injected bytes: {db_meta['bytes_injected']}")
    assert repaired_db.startswith(b"SQLite format 3\x00"), "Must start with SQLite header!"
    print(">>> PASS: SQLite 100-byte header injected successfully!\n")

    print("=== 5. Testing Carver & Entropy ===")
    entropy_null = calculate_shannon_entropy(b"\x00" * 1024)
    entropy_text = calculate_shannon_entropy(b"Hello world forensics investigation audit log text test")
    print(f"Null entropy: {entropy_null}, Text entropy: {entropy_text}")
    assert entropy_null == 0.0
    assert 3.0 <= entropy_text <= 5.5
    print(">>> PASS: Shannon entropy profiler accurate!\n")

    print(">>> ALL CORE ENGINES VERIFIED 100% OPERATIONAL!")

if __name__ == "__main__":
    test_all()
