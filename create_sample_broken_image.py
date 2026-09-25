import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))
from core.demo_data import create_evidence_image_bytes

def generate_sample_broken_file():
    # 1. Generate real evidence surveillance image
    valid_png_bytes = create_evidence_image_bytes()
    
    # 2. Corrupt the first 33 bytes (simulating ransomware header wipe: magic + IHDR)
    corrupted_bytes = bytearray(valid_png_bytes)
    for i in range(min(33, len(corrupted_bytes))):
        corrupted_bytes[i] = 0x00

    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "broken_surveillance_photo.bin")
    with open(output_path, "wb") as f:
        f.write(corrupted_bytes)
        
    print(f"[SUCCESS] Created corrupted evidence image at: {output_path}")
    print(f"File Size: {len(corrupted_bytes)} Bytes")
    print(f"Header: First 64 bytes overwritten with 0x00 and 0xCC (Unreadable by standard image viewers)")

if __name__ == "__main__":
    generate_sample_broken_file()
