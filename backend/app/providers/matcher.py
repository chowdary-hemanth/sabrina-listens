import re
import difflib
from typing import List, Tuple, Set, Optional
from app.schemas.types import TrackMetadata
from app.providers.base import CandidateAudio

STOPWORDS: Set[str] = {
    "the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "of", "with",
    "by", "feat", "ft", "featuring", "official", "video", "audio", "music",
    "hd", "hq", "4k", "original", "lyrics", "lyric", "track", "song"
}

FORBIDDEN_MODIFIERS: List[str] = [
    "remix", "live", "acoustic", "slowed", "reverb", "bassboosted", "bass boosted",
    "instrumental", "karaoke", "cover", "tribute", "extended", "speed up",
    "speedup", "sped up", "nightcore", "orchestral", "mashup", "parody",
    "clean", "radio edit", "demo", "snippet", "preview", "teaser"
]

NOISE_KEYWORDS: List[str] = [
    "1 hour", "2 hours", "3 hours", "8 hours", "10 hours", "12 hours", "100 hours",
    "deep sleep", "sleep music", "white noise", "rain sounds", "waterfall",
    "nature sounds", "relaxing sounds", "ambient sound", "binaural", "meditation"
]

def clean_text(text: Optional[str]) -> str:
    """Lowercases, normalizes whitespace, and strips special characters."""
    if not text:
        return ""
    # Replace punctuation with spaces
    cleaned = re.sub(r"[^\w\s]", " ", text.lower())
    return " ".join(cleaned.split())

def extract_tokens(text: Optional[str], remove_stopwords: bool = True) -> Set[str]:
    """Extracts alphanumeric tokens from text."""
    cleaned = clean_text(text)
    tokens = set(cleaned.split())
    if remove_stopwords:
        tokens = {t for t in tokens if t not in STOPWORDS and len(t) > 1}
    return tokens

class TrackMatcher:
    """
    Algorithmic Track Matcher based on Soundbound & SpotiFlyer architectures.
    Prevents downloading live, slowed, reverb, cover, or incorrect versions
    by calculating a composite confidence score across title, artist, duration,
    and modifier penalties.
    """

    MATCH_THRESHOLD: float = 70.0

    @classmethod
    def score_candidate(cls, target: TrackMetadata, cand: CandidateAudio) -> Tuple[float, List[str]]:
        reasons: List[str] = []
        target_title_clean = clean_text(target.title)
        cand_title_clean = clean_text(cand.title)
        target_artist_clean = clean_text(target.artist)
        cand_artist_clean = clean_text(cand.artist or "")
        cand_uploader_clean = clean_text(cand.uploader or "")

        # 1. Reject Ambient / Noise Loops
        for noise in NOISE_KEYWORDS:
            if noise in cand_title_clean and noise not in target_title_clean:
                reasons.append(f"Rejected: Ambient/noise keyword '{noise}' detected")
                return 0.0, reasons

        # 2. Common Significant Tokens Gate
        target_tokens = extract_tokens(target.title, remove_stopwords=True)
        cand_tokens = extract_tokens(cand.title, remove_stopwords=True)

        if target_tokens and cand_tokens:
            common = target_tokens.intersection(cand_tokens)
            if not common and target_title_clean not in cand_title_clean and cand_title_clean not in target_title_clean:
                reasons.append("Rejected: Zero common significant title tokens")
                return 0.0, reasons
            reasons.append(f"Common tokens: {list(common)}")

        # 3. Duration Sanity & Scoring
        target_dur = target.duration_seconds or 0
        cand_dur = cand.duration_seconds or 0
        duration_score = 75.0  # Default neutral score if duration is unknown

        if target_dur > 0 and cand_dur > 0:
            diff = abs(target_dur - cand_dur)
            # Rejection gate: off by more than 50% or over 90s discrepancy
            if diff > 90 and (cand_dur > target_dur * 1.5 or cand_dur < target_dur * 0.5):
                reasons.append(f"Rejected: Duration mismatch target={target_dur}s vs candidate={cand_dur}s (diff {diff}s)")
                return 0.0, reasons

            if diff <= 2:
                duration_score = 100.0
                reasons.append(f"Duration exact match ({cand_dur}s vs {target_dur}s)")
            elif diff <= 5:
                duration_score = 95.0
                reasons.append(f"Duration close match (diff {diff}s)")
            elif diff <= 12:
                duration_score = 85.0
            elif diff <= 25:
                duration_score = 65.0
            elif diff <= 45:
                duration_score = 45.0
            else:
                duration_score = 20.0
                reasons.append(f"Duration heavily penalized (diff {diff}s)")

        # 4. Title Fuzzy Similarity
        seq_ratio = difflib.SequenceMatcher(None, target_title_clean, cand_title_clean).ratio() * 100.0
        # Token overlap ratio (Jaccard)
        jaccard_ratio = 0.0
        if target_tokens and cand_tokens:
            jaccard_ratio = (len(target_tokens.intersection(cand_tokens)) / len(target_tokens)) * 100.0

        title_score = max(seq_ratio, jaccard_ratio)
        reasons.append(f"Title score: {title_score:.1f}")

        # 5. Artist Matching
        artist_score = 0.0
        target_artist_tokens = extract_tokens(target.artist, remove_stopwords=True)

        # Check in candidate artist string
        if target_artist_clean and target_artist_clean in cand_artist_clean:
            artist_score = 100.0
        elif target_artist_clean and target_artist_clean in cand_title_clean:
            artist_score = 95.0
        elif target_artist_clean and target_artist_clean in cand_uploader_clean:
            artist_score = 90.0
        else:
            cand_all_text = f"{cand_artist_clean} {cand_title_clean} {cand_uploader_clean}"
            if target_artist_tokens:
                matched_art_tokens = sum(1 for t in target_artist_tokens if t in cand_all_text)
                artist_score = (matched_art_tokens / len(target_artist_tokens)) * 85.0
            else:
                artist_score = 50.0

        reasons.append(f"Artist score: {artist_score:.1f}")

        # 6. Modifier & Forbidden Words Evaluation
        modifier_penalty = 0.0
        modifier_bonus = 0.0

        for mod in FORBIDDEN_MODIFIERS:
            in_target = mod in target_title_clean
            in_cand = mod in cand_title_clean

            if in_cand and not in_target:
                # Candidate has unwanted modifier (e.g. remix, live, slowed)
                modifier_penalty += 30.0
                reasons.append(f"Forbidden modifier penalty: -30 ('{mod}' in candidate but not target)")
            elif in_cand and in_target:
                # Candidate matches user's specific requested modifier
                modifier_bonus += 15.0
                reasons.append(f"Requested modifier bonus: +15 ('{mod}')")

        # 7. Official Audio / Topic Bonus
        official_bonus = 0.0
        if "topic" in cand_uploader_clean or "vevo" in cand_uploader_clean or "official" in cand_uploader_clean:
            official_bonus = 8.0
            reasons.append("Official/Topic channel bonus: +8")

        # 8. Composite Score Formulation
        composite = (title_score * 0.45) + (artist_score * 0.30) + (duration_score * 0.25)
        composite = composite - modifier_penalty + modifier_bonus + official_bonus
        composite = max(0.0, min(100.0, composite))

        reasons.append(f"Final composite score: {composite:.1f}")
        return round(composite, 1), reasons

    @classmethod
    def rank_candidates(cls, target: TrackMetadata, candidates: List[CandidateAudio]) -> List[CandidateAudio]:
        """Scores and sorts candidates in descending order of match quality."""
        scored = []
        for cand in candidates:
            score, reasons = cls.score_candidate(target, cand)
            cand.match_score = score
            cand.match_reasons = reasons
            scored.append(cand)
        scored.sort(key=lambda c: c.match_score, reverse=True)
        return scored
