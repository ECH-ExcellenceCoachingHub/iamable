/**
 * ASL fingerspelling recognition from MediaPipe's 21 hand landmarks.
 *
 * Two layers:
 *  1. Hand-shape rules: each letter is described by which fingers are extended, bent or
 *     curled, where the thumb sits and which way the hand points. No training data needed.
 *  2. Personal examples: when a user records their own handshapes for a letter, a nearest-
 *     neighbour match on those examples takes priority, which fixes letters the rules confuse.
 *
 * J and Z are traced in the air, so they can't be read from a single frame and are not detected.
 */

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

export interface LetterGuess {
  letter: string;
  score: number;
  /** Whether the guess came from the user's own recorded examples. */
  personal: boolean;
}

/** Letters that are held still, so they can be recognised from one frame. */
export const STATIC_LETTERS = 'ABCDEFGHIKLMNOPQRSTUVWXY'.split('');

// ---------------------------------------------------------------------------
// Vector helpers

const sub = (a: Point3, b: Point3): Point3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a: Point3, b: Point3) => a.x * b.x + a.y * b.y + a.z * b.z;
const len = (a: Point3) => Math.sqrt(dot(a, a)) || 1e-6;
const scale = (a: Point3, k: number): Point3 => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const norm = (a: Point3) => scale(a, 1 / len(a));
const cross = (a: Point3, b: Point3): Point3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const dist = (a: Point3, b: Point3) => len(sub(a, b));
/** Angle between two vectors, in degrees. */
const angle = (a: Point3, b: Point3) => (Math.acos(Math.max(-1, Math.min(1, dot(norm(a), norm(b))))) * 180) / Math.PI;

// Landmark indices
const WRIST = 0;
const THUMB = [1, 2, 3, 4];
const FINGERS = [
  [5, 6, 7, 8], // index
  [9, 10, 11, 12], // middle
  [13, 14, 15, 16], // ring
  [17, 18, 19, 20], // pinky
];

// ---------------------------------------------------------------------------
// Hand geometry

interface HandFrame {
  origin: Point3;
  /** Wrist → middle knuckle. */
  up: Point3;
  /** Index knuckle → pinky knuckle, perpendicular to `up`. */
  across: Point3;
  /** Out of the palm (towards what the palm faces). */
  palm: Point3;
  size: number;
}

/**
 * A coordinate frame attached to the hand, so features don't depend on where the hand is,
 * how it's rotated, or whether it's a left or right hand.
 */
function handFrame(lm: Point3[]): HandFrame {
  const origin = lm[WRIST];
  const upRaw = sub(lm[9], origin);
  const size = len(upRaw);
  const up = norm(upRaw);
  const side = sub(lm[17], lm[5]);
  const across = norm(sub(side, scale(up, dot(side, up))));
  let palm = norm(cross(up, across));
  // cross() flips with handedness. The thumb's base sits in front of the palm plane on either
  // hand, so point `palm` towards it.
  if (dot(sub(lm[2], origin), palm) < 0) palm = scale(palm, -1);
  return { origin, up, across, palm, size };
}

/** Landmark in hand coordinates: x = towards pinky, y = towards fingers, z = out of palm; in hand lengths. */
function local(frame: HandFrame, p: Point3): Point3 {
  const v = sub(p, frame.origin);
  return { x: dot(v, frame.across) / frame.size, y: dot(v, frame.up) / frame.size, z: dot(v, frame.palm) / frame.size };
}

type FingerState = 'ext' | 'bent' | 'curl';

interface Finger {
  state: FingerState;
  /** Bend at the knuckle, degrees. */
  mcp: number;
  /** Bend at the middle + top joints, degrees. */
  curl: number;
  /** Unit direction knuckle → tip in camera space (y points down). */
  dir: Point3;
}

function finger(lm: Point3[], [mcp, pip, dip, tip]: number[], up: Point3): Finger {
  const base = sub(lm[pip], lm[mcp]);
  const mid = sub(lm[dip], lm[pip]);
  const end = sub(lm[tip], lm[dip]);
  const mcpBend = angle(up, base);
  const curl = angle(base, mid) + angle(mid, end);
  const state: FingerState = curl < 60 && mcpBend < 55 ? 'ext' : curl > 150 || mcpBend + curl > 190 ? 'curl' : 'bent';
  return { state, mcp: mcpBend, curl, dir: norm(sub(lm[tip], lm[mcp])) };
}

export interface HandFeatures {
  fingers: Finger[];
  pattern: string;
  thumbTip: Point3;
  /** Thumb tip position across the knuckles: 0 = index, 1 = pinky, below 0 = beside the index. */
  thumbAcross: number;
  thumbOut: boolean;
  thumbToIndexTip: number;
  thumbToMiddleTip: number;
  thumbToMiddlePip: number;
  indexMiddleSpread: number;
  indexMiddleCrossed: boolean;
  frame: HandFrame;
  local: Point3[];
}

export function handFeatures(lm: Point3[]): HandFeatures {
  const frame = handFrame(lm);
  const L = lm.map((p) => local(frame, p));
  const fingers = FINGERS.map((f) => finger(lm, f, frame.up));
  const thumbTip = L[THUMB[3]];
  const indexX = L[5].x;
  const pinkyX = L[17].x;
  const thumbAcross = (thumbTip.x - indexX) / (pinkyX - indexX || 1e-6);
  const thumbDir = sub(L[4], L[2]);
  // Thumb held out to the side (L, Y): points away from the fingers and sits well outside the index.
  const thumbOut = thumbAcross < -0.35 && angle(thumbDir, { x: 0, y: 1, z: 0 }) > 35 && dist(L[4], L[5]) > 0.45;

  return {
    fingers,
    pattern: fingers.map((f) => f.state[0]).join(''),
    thumbTip,
    thumbAcross,
    thumbOut,
    thumbToIndexTip: dist(L[4], L[8]),
    thumbToMiddleTip: dist(L[4], L[12]),
    thumbToMiddlePip: dist(L[4], L[10]),
    indexMiddleSpread: angle(sub(L[8], L[5]), sub(L[12], L[9])),
    indexMiddleCrossed: L[8].x > L[12].x && fingers[0].state === 'ext' && fingers[1].state === 'ext',
    frame,
    local: L,
  };
}

// ---------------------------------------------------------------------------
// Rules

/** Which way extended fingers point on screen. */
function pointing(dirs: Point3[]): 'up' | 'side' | 'down' {
  const y = dirs.reduce((s, d) => s + d.y, 0) / dirs.length;
  if (y > 0.55) return 'down';
  if (y > -0.5) return 'side';
  return 'up';
}

function ruleLetter(f: HandFeatures): { letter: string; score: number } | null {
  const [index, middle, ring, pinky] = f.fingers;
  const is = (finger: Finger, ...states: FingerState[]) => states.includes(finger.state);
  const folded = (finger: Finger) => is(finger, 'curl', 'bent');

  // Four fingers extended
  if (is(index, 'ext') && is(middle, 'ext') && is(ring, 'ext') && is(pinky, 'ext')) {
    return f.thumbAcross > 0.1 && !f.thumbOut ? { letter: 'B', score: 0.85 } : null;
  }

  // Index, middle, ring
  if (is(index, 'ext') && is(middle, 'ext') && is(ring, 'ext') && folded(pinky)) return { letter: 'W', score: 0.85 };

  // Thumb and index make a circle, other three up
  if (is(middle, 'ext') && is(ring, 'ext') && is(pinky, 'ext') && !is(index, 'ext') && f.thumbToIndexTip < 0.35) {
    return { letter: 'F', score: 0.85 };
  }

  // Index and middle
  if (is(index, 'ext') && is(middle, 'ext') && folded(ring) && folded(pinky)) {
    const dir = pointing([index.dir, middle.dir]);
    if (dir === 'down') return { letter: 'P', score: 0.7 };
    if (dir === 'side') return { letter: 'H', score: 0.75 };
    if (f.indexMiddleCrossed) return { letter: 'R', score: 0.75 };
    if (f.thumbToMiddlePip < 0.35 && f.thumbTip.y > 0.9) return { letter: 'K', score: 0.7 };
    return f.indexMiddleSpread > 15 ? { letter: 'V', score: 0.85 } : { letter: 'U', score: 0.8 };
  }

  // Index only
  if (is(index, 'ext') && folded(middle) && folded(ring) && folded(pinky)) {
    const dir = pointing([index.dir]);
    if (dir === 'down') return { letter: 'Q', score: 0.7 };
    if (dir === 'side') return { letter: 'G', score: 0.7 };
    if (f.thumbOut) return { letter: 'L', score: 0.9 };
    return { letter: 'D', score: 0.8 };
  }

  // Pinky only
  if (is(pinky, 'ext') && folded(index) && folded(middle) && folded(ring)) {
    return f.thumbOut || f.thumbAcross < -0.5 ? { letter: 'Y', score: 0.9 } : { letter: 'I', score: 0.85 };
  }

  // Index hooked, others closed
  if (is(index, 'bent') && index.mcp < 50 && is(middle, 'curl') && is(ring, 'curl') && is(pinky, 'curl')) {
    return { letter: 'X', score: 0.65 };
  }

  const allFolded = folded(index) && folded(middle) && folded(ring) && folded(pinky);
  if (!allFolded) return null;

  // Fingertips meet the thumb in a ring
  if (f.thumbToIndexTip < 0.3 && f.thumbToMiddleTip < 0.4 && index.mcp < 70) return { letter: 'O', score: 0.75 };

  // Curved hand with a gap between thumb and fingers
  if (f.fingers.every((x) => x.state === 'bent' && x.mcp < 60) && f.thumbToIndexTip >= 0.3) return { letter: 'C', score: 0.7 };

  // Fingertips bent down to rest on the thumb, knuckles straight
  if (f.fingers.every((x) => x.mcp < 45 && x.curl > 110) && f.thumbAcross > 0.1) return { letter: 'E', score: 0.65 };

  // Fist family: the thumb's position tells them apart
  if (f.thumbAcross < 0.1) return { letter: 'A', score: 0.75 };
  if (f.thumbAcross > 0.62) return { letter: 'M', score: 0.6 };
  // Tucked thumbs sit behind the fingertips; S wraps in front of them.
  const tucked = f.thumbTip.z < f.local[7].z;
  if (f.thumbAcross > 0.38) return tucked ? { letter: 'N', score: 0.6 } : { letter: 'S', score: 0.65 };
  return tucked ? { letter: 'T', score: 0.6 } : { letter: 'S', score: 0.65 };
}

// ---------------------------------------------------------------------------
// Personal examples

export type LetterSamples = Record<string, number[][]>;

/** Hand shape as a flat vector, independent of position, size, rotation and handedness. */
export function sampleVector(lm: Point3[]): number[] {
  const { local: L } = handFeatures(lm);
  return L.flatMap((p) => [p.x, p.y, p.z]);
}

const MAX_MATCH_DISTANCE = 0.65;
const K = 5;

function nearestLetter(vector: number[], samples: LetterSamples): { letter: string; score: number } | null {
  const scored: { letter: string; d: number }[] = [];
  for (const [letter, list] of Object.entries(samples)) {
    for (const s of list) {
      let sum = 0;
      for (let i = 0; i < s.length; i++) sum += (s[i] - vector[i]) ** 2;
      scored.push({ letter, d: Math.sqrt(sum) });
    }
  }
  if (!scored.length) return null;
  scored.sort((a, b) => a.d - b.d);
  const top = scored.slice(0, K);
  if (top[0].d > MAX_MATCH_DISTANCE) return null;
  const votes: Record<string, number> = {};
  for (const t of top) votes[t.letter] = (votes[t.letter] ?? 0) + 1;
  const [letter, count] = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
  if (count < Math.ceil(top.length / 2)) return null;
  const closeness = 1 - top[0].d / MAX_MATCH_DISTANCE;
  return { letter, score: Math.min(0.99, 0.6 + 0.2 * closeness + 0.2 * (count / top.length)) };
}

/**
 * Guess the fingerspelled letter from 3D hand landmarks (MediaPipe `worldLandmarks`).
 * Returns null when the hand isn't making a recognisable letter.
 */
export function recogniseLetter(landmarks: Point3[], samples: LetterSamples = {}): LetterGuess | null {
  if (landmarks.length < 21) return null;
  const hasSamples = Object.values(samples).some((list) => list.length > 0);
  if (hasSamples) {
    const personal = nearestLetter(sampleVector(landmarks), samples);
    if (personal) return { ...personal, personal: true };
  }
  const rule = ruleLetter(handFeatures(landmarks));
  return rule ? { ...rule, personal: false } : null;
}
