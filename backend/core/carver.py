import math
from typing import List, Dict, Any, Tuple
from collections import Counter

def calculate_shannon_entropy(data: bytes) -> float:
    """Calculates Shannon Entropy in bits per byte (0.0 to 8.0)."""
    if not data:
        return 0.0
    counter = Counter(data)
    total_bytes = len(data)
    entropy = 0.0
    for count in counter.values():
        p = count / total_bytes
        entropy -= p * math.log2(p)
    return round(entropy, 4)

def calculate_byte_frequency_histogram(data: bytes) -> Dict[str, Any]:
    """Generates byte frequency statistics and histograms."""
    if not data:
        return {
            "printable_ratio": 0.0,
            "null_ratio": 0.0,
            "high_byte_ratio": 0.0,
            "unique_bytes": 0,
            "histogram": [0] * 256
        }
    
    total = len(data)
    histogram = [0] * 256
    printable_count = 0
    null_count = 0
    high_byte_count = 0

    for b in data:
        histogram[b] += 1
        if b == 0:
            null_count += 1
        elif 32 <= b <= 126 or b in (9, 10, 13):
            printable_count += 1
        elif b >= 128:
            high_byte_count += 1

    return {
        "printable_ratio": round(printable_count / total, 4),
        "null_ratio": round(null_count / total, 4),
        "high_byte_ratio": round(high_byte_count / total, 4),
        "unique_bytes": sum(1 for c in histogram if c > 0),
        "histogram": histogram
    }

def detect_magic_signature(data: bytes) -> Tuple[str, str]:
    """Detects standard file format signatures from the first bytes."""
    if len(data) < 4:
        return ("Unknown", "None")
    
    # PNG: 89 50 4E 47 0D 0A 1A 0A
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return ("PNG Image", "Valid Header")
    # JPEG: FF D8 FF
    if data.startswith(b"\xFF\xD8\xFF"):
        return ("JPEG Image", "Valid Header")
    # SQLite: SQLite format 3\0
    if data.startswith(b"SQLite format 3\x00"):
        return ("SQLite Database", "Valid Header")
    # PDF: %PDF-
    if data.startswith(b"%PDF-"):
        return ("PDF Document", "Valid Header")
    # ZIP / Office DOCX/XLSX: PK\x03\x04
    if data.startswith(b"PK\x03\x04"):
        return ("ZIP Archive / Office Doc", "Valid Header")
    # ELF: \x7FELF
    if data.startswith(b"\x7FELF"):
        return ("ELF Executable", "Valid Header")
    # Windows PE: MZ
    if data.startswith(b"MZ"):
        return ("Windows PE Executable", "Valid Header")

    # Partial / Corrupted signature heuristics:
    if b"PNG" in data[:32] or b"IHDR" in data[:32]:
        return ("PNG Image", "Damaged Header (Missing Magic Bytes)")
    if b"JFIF" in data[:32] or b"Exif" in data[:32]:
        return ("JPEG Image", "Damaged Header (Corrupted SOI)")
    if b"SQLite" in data[:64] or b"table" in data[:128] or b"CREATE" in data[:128]:
        return ("SQLite Database", "Damaged Header (Corrupted Header Page)")

    return ("Unknown", "No Header Match")

def classify_block(data: bytes) -> Dict[str, Any]:
    """Classifies a binary block even without headers using statistical entropy and byte distribution."""
    if not data:
        return {"category": "Empty", "confidence": 0.0, "details": "0 bytes"}

    entropy = calculate_shannon_entropy(data)
    bfh = calculate_byte_frequency_histogram(data)
    magic_name, magic_status = detect_magic_signature(data)

    printable_ratio = bfh["printable_ratio"]
    null_ratio = bfh["null_ratio"]
    high_byte_ratio = bfh["high_byte_ratio"]

    # 1. Null / Slack space
    if null_ratio >= 0.88:
        return {
            "category": "System Noise / Slack Space",
            "type_code": "SLACK_NULL",
            "confidence": 0.98,
            "entropy": entropy,
            "printable_ratio": printable_ratio,
            "details": f"Null byte padding ({round(null_ratio*100, 1)}% zero bytes)"
        }

    # 2. Valid Magic Header Match
    if magic_status == "Valid Header":
        return {
            "category": f"Intact File: {magic_name}",
            "type_code": "HEADER_VALID",
            "confidence": 0.99,
            "entropy": entropy,
            "printable_ratio": printable_ratio,
            "details": f"Detected valid {magic_name} signature"
        }

    # 3. Damaged Header Match
    if "Damaged Header" in magic_status:
        return {
            "category": f"Corrupted {magic_name}",
            "type_code": "HEADER_CORRUPTED",
            "confidence": 0.88,
            "entropy": entropy,
            "printable_ratio": printable_ratio,
            "details": magic_status
        }

    # 4. Plaintext / Log / Chat Evidence (No header)
    if printable_ratio >= 0.80 and 3.0 <= entropy <= 5.8:
        # Check if chat / threat log keywords appear
        lower_preview = data[:300].lower()
        is_chat_or_threat = any(k in lower_preview for k in [b"http", b"pass", b"key", b"user", b":", b"admin", b"ransom", b"leak"])
        return {
            "category": "Plaintext / Chat / Forensic Log",
            "type_code": "TEXT_FORENSIC",
            "confidence": 0.94 if is_chat_or_threat else 0.86,
            "entropy": entropy,
            "printable_ratio": printable_ratio,
            "details": "High printable ASCII density; textual evidence fragment"
        }

    # 5. SQLite Page / DB Block
    # SQLite pages typically have cell pointers, moderate entropy, mixed binary + ASCII table schema/data
    has_sql_hints = any(k in data for k in [b"CREATE TABLE", b"INSERT INTO", b"VALUES", b"INTEGER", b"TEXT"])
    if has_sql_hints or (0.10 <= null_ratio <= 0.65 and 0.20 <= printable_ratio <= 0.75 and 4.0 <= entropy <= 6.5):
        return {
            "category": "SQLite DB Table Page",
            "type_code": "DB_PAGE",
            "confidence": 0.92 if has_sql_hints else 0.78,
            "entropy": entropy,
            "printable_ratio": printable_ratio,
            "details": "Database B-Tree structure and record payload markers"
        }

    # 6. Compressed Media or Encrypted Payload
    if entropy >= 7.2 and bfh["unique_bytes"] >= 190:
        return {
            "category": "Compressed Media / Encrypted Stream",
            "type_code": "COMPRESSED_OR_ENCRYPTED",
            "confidence": 0.85,
            "entropy": entropy,
            "printable_ratio": printable_ratio,
            "details": f"Very high entropy ({entropy:.2f} bits/byte); compressed or encrypted block"
        }

    # 7. Executable / Binary Machine Code
    if 5.5 <= entropy <= 7.2 and high_byte_ratio >= 0.30:
        return {
            "category": "Binary Code / Executable Payload",
            "type_code": "BINARY_PAYLOAD",
            "confidence": 0.80,
            "entropy": entropy,
            "printable_ratio": printable_ratio,
            "details": "Compiled binary instructions and data tables"
        }

    return {
        "category": "Unclassified Raw Binary",
        "type_code": "RAW_BINARY",
        "confidence": 0.60,
        "entropy": entropy,
        "printable_ratio": printable_ratio,
        "details": "Mixed entropy binary fragment"
    }

def analyze_stream_sectors(raw_bytes: bytes, block_size: int = 4096) -> Dict[str, Any]:
    """Slices raw data into sectors/clusters and produces a comprehensive forensic sector map."""
    total_len = len(raw_bytes)
    if total_len == 0:
        return {"total_bytes": 0, "total_blocks": 0, "blocks": []}

    blocks = []
    num_blocks = math.ceil(total_len / block_size)

    for i in range(num_blocks):
        offset = i * block_size
        chunk = raw_bytes[offset:offset + block_size]
        classification = classify_block(chunk)
        
        # Hex and ASCII preview of first 128 bytes (for full Sector Hex Viewer)
        hex_preview = " ".join(f"{b:02X}" for b in chunk[:128])
        ascii_preview = "".join(chr(b) if 32 <= b <= 126 else "." for b in chunk[:128])

        blocks.append({
            "block_index": i,
            "offset": offset,
            "size": len(chunk),
            "hex_preview": hex_preview,
            "ascii_preview": ascii_preview,
            "classification": classification,
            "entropy": classification["entropy"]
        })

    avg_entropy = round(sum(b["entropy"] for b in blocks) / len(blocks), 4) if blocks else 0.0

    return {
        "total_bytes": total_len,
        "block_size": block_size,
        "total_blocks": len(blocks),
        "average_entropy": avg_entropy,
        "blocks": blocks
    }
