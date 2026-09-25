import sqlite3
import os

def create_sample_corrupted_ledger():
    output_dir = os.path.dirname(os.path.abspath(__file__))
    sample_dir = os.path.join(output_dir, "sample_fragments")
    os.makedirs(sample_dir, exist_ok=True)

    clean_db_path = os.path.join(sample_dir, "clean_financial_ledger.db")

    if os.path.exists(clean_db_path):
        os.remove(clean_db_path)

    conn = sqlite3.connect(clean_db_path)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE illicit_transfers (
            id INTEGER PRIMARY KEY,
            txn_date TEXT NOT NULL,
            sender TEXT NOT NULL,
            receiver TEXT NOT NULL,
            amount_usd REAL NOT NULL,
            method TEXT NOT NULL,
            flag TEXT NOT NULL
        )
    """)

    rows = [
        (1, "2026-09-10", "Ahmad_UAE", "GhostVault_LLC", 250000.00, "Crypto Mixer", "SUSPICIOUS"),
        (2, "2026-09-11", "Mikhail_RU", "CyprusNest_Ltd", 875000.00, "Wire Transfer", "ILLICIT"),
        (3, "2026-09-13", "ShadowFin_Corp", "PanamaHold_Inc", 1400000.00, "Hawala Network", "ILLICIT"),
        (4, "2026-09-15", "Jang_CN", "TurkeyProxy_Co", 320000.00, "Bitcoin", "SUSPICIOUS"),
        (5, "2026-09-16", "OffshoreX_Ltd", "CaymanHaven_Inc", 2100000.00, "Shell Transfer", "ILLICIT"),
    ]
    cursor.executemany("INSERT INTO illicit_transfers VALUES (?,?,?,?,?,?,?)", rows)
    conn.commit()
    conn.close()

    with open(clean_db_path, "rb") as f:
        db_bytes = bytearray(f.read())

    # Corrupt first 100 bytes (simulate SQLite header wipe)
    for i in range(min(100, len(db_bytes))):
        db_bytes[i] = 0x00

    corrupted_db_path = os.path.join(sample_dir, "CORRUPTED_financial_ledger.db")
    with open(corrupted_db_path, "wb") as f:
        f.write(db_bytes)

    print("[SUCCESS] Corrupted SQLite DB created at:", corrupted_db_path)
    print("Size:", len(db_bytes), "bytes")

if __name__ == "__main__":
    create_sample_corrupted_ledger()
