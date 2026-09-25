import sys
import os
import json
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from main import app

client = TestClient(app)

def test_api():
    print("=== Testing FastAPI Endpoints ===")

    # 1. /api/status
    res = client.get("/api/status")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ONLINE"
    print(">>> 1. /api/status: OK")

    # 2. /api/scenarios
    res = client.get("/api/scenarios")
    assert res.status_code == 200
    scenarios = res.json()
    assert len(scenarios) == 3
    print(f">>> 2. /api/scenarios: OK ({len(scenarios)} scenarios found)")

    # 3. /api/scenarios/{id}
    res = client.get("/api/scenarios/case_1_fragmented_leaks")
    assert res.status_code == 200
    c1 = res.json()
    assert len(c1["fragments"]) == 3
    print(">>> 3. /api/scenarios/case_1_fragmented_leaks: OK")

    # 4. /api/stitch
    res = client.post("/api/stitch", json={"fragments": c1["fragments"]})
    assert res.status_code == 200
    stitch_data = res.json()
    assert stitch_data["stitching"]["reassembled_order"] == c1["correct_sequence"]
    assert len(stitch_data["triage"]["critical"]) >= 3
    print(f">>> 4. /api/stitch: OK (Confidence: {stitch_data['stitching']['confidence_score']}%, Critical IOCs: {len(stitch_data['triage']['critical'])})")

    # 5. /api/repair (Case 2: PNG)
    res = client.post("/api/repair", json={"scenario_id": "case_2_broken_image"})
    assert res.status_code == 200
    rep_png = res.json()
    assert rep_png["format"] == "PNG"
    assert rep_png["is_valid"] is True
    assert len(rep_png["repaired_b64"]) > 100
    print(">>> 5. /api/repair (PNG): OK (Header regenerated, image valid)")

    # 6. /api/repair (Case 3: SQLite)
    res = client.post("/api/repair", json={"scenario_id": "case_3_sqlite_ledger"})
    assert res.status_code == 200
    rep_db = res.json()
    assert rep_db["format"] == "SQLite3"
    assert rep_db["sqlite_extraction"]["success"] is True
    print(f">>> 6. /api/repair (SQLite): OK (Extracted tables: {rep_db['sqlite_extraction']['tables_found']})")

    # 7. Frontend root /
    res = client.get("/")
    assert res.status_code == 200
    assert "ForensiX-AI" in res.text or "<!doctype html>" in res.text.lower()
    print(">>> 7. Frontend static root /: OK (Dist mounted and served)")

    print("\n>>> ALL API & FRONTEND INTEGRATION TESTS PASSED!")

if __name__ == "__main__":
    test_api()
