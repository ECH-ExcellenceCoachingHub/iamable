/**
 * Whole-body sign features for the trainable sign model.
 *
 * A sign is more than one handshape: it uses both hands, where they are relative to the face
 * and body, and how they move. Each camera frame becomes a vector of:
 *   - upper-body pose (face, shoulders, elbows, wrists) relative to the shoulders
 *   - for each hand (matched to the body's left / right wrist): whether it's visible, where it is
 *     relative to the body, which way it points, and its handshape
 * and a sample is a short clip: the last WINDOW_MS resampled to WINDOW_FRAMES evenly spaced
 * frames, so movement is part of what the model learns. Static signs work too; their frames
 * are simply alike.
 *
 * The backend validates vectors against BODY_FEATURE_SIZE (backend/src/ai/ai.service.ts), so a
 * change here needs a new FEATURE_VERSION and matching backend constant.
 */
import { sampleVector, type Point3 } from '@/lib/fingerspelling';

export const FEATURE_VERSION = 'body-v1';
export const WINDOW_FRAMES = 8;
export const WINDOW_MS = 1200;

/** MediaPipe Pose indices: nose, eyes, mouth corners, shoulders, elbows, wrists. */
const POSE_POINTS = [0, 2, 5, 9, 10, 11, 12, 13, 14, 15, 16];
const L_SHOULDER = 11;
const R_SHOULDER = 12;
const L_WRIST = 15;
const R_WRIST = 16;

/** present + wrist & palm-centre position (4) + direction vectors (6) + handshape (63) */
const HAND_SIZE = 1 + 4 + 6 + 63;
export const FRAME_SIZE = POSE_POINTS.length * 2 + 2 * HAND_SIZE; // 170
export const BODY_FEATURE_SIZE = FRAME_SIZE * WINDOW_FRAMES; // 1360

export interface DetectedHand {
  /** 21 landmarks in normalised image coordinates. */
  landmarks: Point3[];
  /** 21 landmarks in metres, centred on the hand. */
  world: Point3[];
}

export interface BodyObservation {
  /** 33 pose landmarks in normalised image coordinates, or null when no person is visible. */
  pose: Point3[] | null;
  hands: DetectedHand[];
  /** Video width / height, so x and y are measured in the same units. */
  aspect: number;
}

const norm3 = (x: number, y: number, z: number) => {
  const l = Math.hypot(x, y, z) || 1e-6;
  return [x / l, y / l, z / l];
};

/** Features for one camera frame, or null when the upper body isn't visible. */
export function frameFeatures({ pose, hands, aspect }: BodyObservation): number[] | null {
  if (!pose || pose.length <= R_WRIST) return null;

  // Body frame: origin between the shoulders, one unit = shoulder width
  const ox = ((pose[L_SHOULDER].x + pose[R_SHOULDER].x) / 2) * aspect;
  const oy = (pose[L_SHOULDER].y + pose[R_SHOULDER].y) / 2;
  const scale = Math.hypot((pose[L_SHOULDER].x - pose[R_SHOULDER].x) * aspect, pose[L_SHOULDER].y - pose[R_SHOULDER].y) || 1e-3;
  const body = (p: Point3) => [(p.x * aspect - ox) / scale, (p.y - oy) / scale];

  const out: number[] = POSE_POINTS.flatMap((i) => body(pose[i]));

  // Match hands to the body's wrists, so "left hand" always means the same hand
  const wrists = [body(pose[L_WRIST]), body(pose[R_WRIST])];
  const gap = (h: DetectedHand, w: number[]) => {
    const [x, y] = body(h.landmarks[0]);
    return Math.hypot(x - w[0], y - w[1]);
  };
  const slots: (DetectedHand | null)[] = [null, null];
  const [a, b] = hands;
  if (a && b) {
    const straight = gap(a, wrists[0]) + gap(b, wrists[1]);
    const swapped = gap(a, wrists[1]) + gap(b, wrists[0]);
    [slots[0], slots[1]] = straight <= swapped ? [a, b] : [b, a];
  } else if (a) {
    slots[gap(a, wrists[0]) <= gap(a, wrists[1]) ? 0 : 1] = a;
  }

  for (const hand of slots) {
    if (!hand || hand.world.length < 21 || hand.landmarks.length < 21) {
      for (let i = 0; i < HAND_SIZE; i++) out.push(0);
      continue;
    }
    const w = hand.world;
    out.push(
      1,
      ...body(hand.landmarks[0]),
      ...body(hand.landmarks[9]),
      ...norm3(w[9].x - w[0].x, w[9].y - w[0].y, w[9].z - w[0].z),
      ...norm3(w[17].x - w[5].x, w[17].y - w[5].y, w[17].z - w[5].z),
      ...sampleVector(w)
    );
  }
  return out;
}

/**
 * Rolling buffer of frame features. `vector()` returns the last WINDOW_MS as one clip of
 * WINDOW_FRAMES frames, resampled by time so recording and recognition agree at any frame rate.
 */
export class MotionWindow {
  private frames: { t: number; f: number[] }[] = [];

  push(t: number, features: number[] | null) {
    if (features) this.frames.push({ t, f: features });
    const cutoff = t - WINDOW_MS * 1.5;
    while (this.frames.length && this.frames[0].t < cutoff) this.frames.shift();
  }

  reset() {
    this.frames = [];
  }

  /** The current clip, or null until a full window of the body has been seen. */
  vector(now: number): number[] | null {
    const frames = this.frames;
    if (frames.length < WINDOW_FRAMES) return null;
    const start = now - WINDOW_MS;
    // Need frames reaching back (almost) to the window start, and a recent one
    if (frames[0].t > start + WINDOW_MS * 0.2 || now - frames[frames.length - 1].t > 250) return null;

    const out: number[] = [];
    let j = 0;
    for (let i = 0; i < WINDOW_FRAMES; i++) {
      const target = start + (i * WINDOW_MS) / (WINDOW_FRAMES - 1);
      while (j < frames.length - 1 && Math.abs(frames[j + 1].t - target) <= Math.abs(frames[j].t - target)) j++;
      // A long gap (body out of view) would make the clip meaningless
      if (Math.abs(frames[j].t - target) > 300) return null;
      out.push(...frames[j].f);
    }
    return out.map((v) => Math.round(v * 1000) / 1000);
  }
}

/** Share of a clip's frames in which at least one hand was visible. */
export function handsInClip(clip: number[]): number {
  const handStart = POSE_POINTS.length * 2;
  let withHands = 0;
  for (let f = 0; f < WINDOW_FRAMES; f++) {
    const base = f * FRAME_SIZE + handStart;
    if (clip[base] > 0.5 || clip[base + HAND_SIZE] > 0.5) withHands++;
  }
  return withHands / WINDOW_FRAMES;
}
