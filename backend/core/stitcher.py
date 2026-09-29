import re
import math
from typing import List, Dict, Any, Tuple
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    SKLEARN_AVAILABLE = True
except (ImportError, Exception):
    SKLEARN_AVAILABLE = False

def _pure_python_ngram_cosine(text_a: str, text_b: str) -> float:
    """Fallback character n-gram cosine similarity when scikit-learn is unavailable."""
    def get_char_ngrams(s: str) -> Dict[str, int]:
        ngrams: Dict[str, int] = {}
        s_clean = s.lower()
        for n in (1, 2, 3):
            for i in range(max(0, len(s_clean) - n + 1)):
                gram = s_clean[i:i+n]
                ngrams[gram] = ngrams.get(gram, 0) + 1
        return ngrams

    vec_a = get_char_ngrams(text_a)
    vec_b = get_char_ngrams(text_b)
    all_keys = set(vec_a.keys()) | set(vec_b.keys())
    if not all_keys:
        return 0.0
    dot_prod = sum(vec_a.get(k, 0) * vec_b.get(k, 0) for k in all_keys)
    norm_a = math.sqrt(sum(v * v for v in vec_a.values()))
    norm_b = math.sqrt(sum(v * v for v in vec_b.values()))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return float(dot_prod / (norm_a * norm_b))

def extract_timestamps(text: str) -> List[str]:
    """Finds ISO/standard forensic timestamps in text fragments."""
    patterns = [
        r"\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}",
        r"\d{2}:\d{2}:\d{2}",
        r"\d{2}/\d{2}/\d{4} \d{2}:\d{2}:\d{2}"
    ]
    timestamps = []
    for pat in patterns:
        matches = re.findall(pat, text)
        if matches:
            timestamps.extend(matches)
    return timestamps

def calculate_boundary_affinity(frag_a: str, frag_b: str) -> Tuple[float, str]:
    """
    Computes directional continuity affinity (A -> B).
    Evaluates whether Fragment B logically and syntactically follows Fragment A.
    Returns (score 0.0 to 1.0, reasoning string).
    """
    if not frag_a or not frag_b:
        return 0.0, "Empty fragment"

    tail_a = frag_a[-300:].strip()
    head_b = frag_b[:300].strip()

    reasons = []
    base_score = 0.40  # Neutral baseline

    # 1. Semantic N-gram / TF-IDF Affinity between tail_a and head_b
    cos_sim = 0.0
    if SKLEARN_AVAILABLE:
        try:
            vectorizer = TfidfVectorizer(ngram_range=(1, 3), analyzer="char_wb", min_df=1)
            tfidf_matrix = vectorizer.fit_transform([tail_a, head_b])
            cos_sim = float(cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0])
        except Exception:
            cos_sim = _pure_python_ngram_cosine(tail_a, head_b)
    else:
        cos_sim = _pure_python_ngram_cosine(tail_a, head_b)

    semantic_boost = cos_sim * 0.35
    base_score += semantic_boost
    if cos_sim > 0.3:
        reasons.append(f"High vocabulary/n-gram continuity ({cos_sim*100:.1f}%)")

    # 2. Timestamp Monotonicity Check
    ts_a = extract_timestamps(frag_a)
    ts_b = extract_timestamps(frag_b)
    if ts_a and ts_b:
        last_ts_a = ts_a[-1]
        first_ts_b = ts_b[0]
        if last_ts_a <= first_ts_b:
            base_score += 0.25
            reasons.append(f"Chronological timestamp progression: '{last_ts_a}' -> '{first_ts_b}'")
        else:
            base_score -= 0.35
            reasons.append(f"Timestamp order reversed: '{last_ts_a}' followed by older '{first_ts_b}'")

    # 3. Syntactic Line / Sentence Boundary Analysis
    # Does tail_a end in the middle of a sentence or tag?
    has_unclosed_quote = tail_a.count('"') % 2 != 0 or tail_a.count("'") % 2 != 0
    has_unclosed_bracket = (tail_a.count('[') > tail_a.count(']')) or (tail_a.count('{') > tail_a.count('}'))
    
    # Check if tail_a does NOT end with sentence terminator (. ! ? \n)
    is_mid_sentence = len(tail_a) > 0 and tail_a[-1] not in ".!?\n\r"
    first_char_b = head_b[0] if head_b else ""
    is_lower_continuation = first_char_b.islower() or first_char_b in " \t,;:)]}"

    if is_mid_sentence and is_lower_continuation:
        base_score += 0.20
        reasons.append("Syntactic word/sentence continuation across boundary")

    if has_unclosed_quote and (head_b.count('"') % 2 != 0 or head_b.count("'") % 2 != 0):
        base_score += 0.15
        reasons.append("Unclosed quotation seamlessly matched in adjacent block")

    if has_unclosed_bracket and (head_b.count(']') > 0 or head_b.count('}') > 0):
        base_score += 0.15
        reasons.append("Bracket enclosure integrity validated")

    # 4. Turn-taking / Chat Dialog Markers
    speaker_patterns = [r"\[attacker\]", r"\[victim\]", r"\[operator\]", r"\[target\]", r"user:", r"admin:"]
    tail_speakers = [s for s in speaker_patterns if re.search(s, tail_a.lower())]
    head_speakers = [s for s in speaker_patterns if re.search(s, head_b.lower())]
    if tail_speakers and head_speakers and tail_speakers[-1] != head_speakers[0]:
        base_score += 0.10
        reasons.append("Realistic conversational turn-taking")

    final_score = max(0.01, min(0.99, base_score))
    explanation = " + ".join(reasons) if reasons else "Standard statistical byte continuity"
    return round(final_score, 4), explanation

def solve_fragment_puzzle(fragments: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Takes an array of disordered fragments and finds the optimal chronological / semantic sequence.
    Each fragment dict: {"id": str, "content": str, "sector_offset": int (optional)}
    """
    n = len(fragments)
    if n <= 1:
        return {
            "reassembled_order": [f["id"] for f in fragments],
            "confidence_score": 100.0,
            "junctions": [],
            "reassembled_text": fragments[0]["content"] if fragments else "",
            "explanation": "Single fragment or empty"
        }

    # Compute pairwise affinity matrix: score[i][j] = affinity of fragment[i] followed by fragment[j]
    affinities = {}
    explanations = {}
    for i, frag_a in enumerate(fragments):
        for j, frag_b in enumerate(fragments):
            if i != j:
                score, reason = calculate_boundary_affinity(frag_a["content"], frag_b["content"])
                affinities[(i, j)] = score
                explanations[(i, j)] = reason

    # Find optimal path using permutation / greedy search (n is typically 2-6 in forensics demos)
    import itertools
    best_path = None
    best_total_score = -1.0

    for perm in itertools.permutations(range(n)):
        total_score = 0.0
        for k in range(n - 1):
            total_score += affinities.get((perm[k], perm[k+1]), 0.0)
        
        # Add head/start bonus: fragments that start with document headers or earliest timestamps
        first_frag = fragments[perm[0]]["content"]
        ts_first = extract_timestamps(first_frag)
        if ts_first and not any(extract_timestamps(fragments[perm[x]]["content"]) and extract_timestamps(fragments[perm[x]]["content"])[0] < ts_first[0] for x in range(1, n)):
            total_score += 0.5  # Earliest timestamp should be first

        if total_score > best_total_score:
            best_total_score = total_score
            best_path = perm

    # Build junction details
    junctions = []
    reassembled_parts = []
    path_confidences = []

    for k in range(len(best_path)):
        idx = best_path[k]
        frag = fragments[idx]
        reassembled_parts.append(frag["content"])

        if k < len(best_path) - 1:
            next_idx = best_path[k+1]
            score = affinities.get((idx, next_idx), 0.5)
            reason = explanations.get((idx, next_idx), "Heuristic link")
            path_confidences.append(score)
            junctions.append({
                "from_fragment": frag["id"],
                "to_fragment": fragments[next_idx]["id"],
                "affinity_score": round(score * 100, 1),
                "reason": reason
            })

    avg_conf = (sum(path_confidences) / len(path_confidences)) if path_confidences else 0.95
    overall_confidence = round(min(99.4, avg_conf * 100), 1)

    reassembled_text = "\n".join(reassembled_parts)
    ordered_ids = [fragments[i]["id"] for i in best_path]

    return {
        "reassembled_order": ordered_ids,
        "confidence_score": overall_confidence,
        "junctions": junctions,
        "reassembled_text": reassembled_text,
        "explanation": f"Successfully reassembled {n} non-contiguous fragments with {overall_confidence}% continuity confidence."
    }
