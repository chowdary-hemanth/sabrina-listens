import { CandidateAudio } from '../../types';

function similarity(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  // Simple token overlap Jaccard
  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));
  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  return intersection.size / union.size;
}

const LIVE_TERMS = ['live', 'concert', 'tour', 'festival', 'performance'];
const MOD_TERMS = ['slowed', 'reverb', 'remix', 'sped up', 'speed up', 'nightcore', '8d audio', 'lofi'];
const NOISE_TERMS = ['karaoke', 'instrumental', 'tribute', 'cover', 'backing track', 'ringtone'];

export function scoreCandidate(
  target: { title: string; artist: string; duration_seconds?: number },
  cand: CandidateAudio
): number {
  const targetTitleLower = target.title.toLowerCase();
  const candTitleLower = cand.title.toLowerCase();

  const titleSim = similarity(target.title, cand.title);
  const artistSim = target.artist ? similarity(target.artist, cand.artist) : 0.8;

  let score = 0.6 * titleSim + 0.4 * artistSim;

  // Duration penalty
  if (target.duration_seconds && cand.duration_seconds) {
    const diff = Math.abs(target.duration_seconds - cand.duration_seconds);
    if (diff <= 5) score += 0.05;
    else if (diff > 30) score -= 0.35;
    else if (diff > 15) score -= 0.15;
  }

  // Live penalty
  if (LIVE_TERMS.some((t) => candTitleLower.includes(t)) && !LIVE_TERMS.some((t) => targetTitleLower.includes(t))) {
    score -= 0.35;
  }

  // Mod penalty
  if (MOD_TERMS.some((t) => candTitleLower.includes(t)) && !MOD_TERMS.some((t) => targetTitleLower.includes(t))) {
    score -= 0.30;
  }

  // Noise penalty
  if (NOISE_TERMS.some((t) => candTitleLower.includes(t)) && !NOISE_TERMS.some((t) => targetTitleLower.includes(t))) {
    score -= 0.50;
  }

  return Math.max(0, Math.min(1.0, score));
}

export function pickBestCandidate(
  target: { title: string; artist: string; duration_seconds?: number },
  candidates: CandidateAudio[],
  minScore = 0.55
): CandidateAudio | null {
  if (candidates.length === 0) return null;

  let best: CandidateAudio | null = null;
  let maxScore = -1;

  for (const c of candidates) {
    const s = scoreCandidate(target, c);
    c.score = s;
    if (s > maxScore && s >= minScore) {
      maxScore = s;
      best = c;
    }
  }

  return best;
}
