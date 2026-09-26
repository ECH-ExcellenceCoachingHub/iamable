'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Point3 } from '@/lib/fingerspelling';
import type { BodyObservation } from '@/lib/body-features';

export const TASKS_VISION_VERSION = '0.10.35';
export const TASKS_VISION_WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`;
const HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const POSE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

/**
 * MediaPipe's WASM runtime writes routine status lines ("INFO: Created TensorFlow Lite XNNPACK
 * delegate for CPU.", glog "I0923 …"/"W0923 …" lines) to console.error, which the Next.js dev
 * overlay reports as errors. Drop just those lines; everything else still reaches console.error.
 */
const MEDIAPIPE_LOG = /^(INFO:|WARNING: .*(tflite|mediapipe)|[IW]\d{4} \d{2}:\d{2}:\d{2})/i;
let mediaPipeLogsSilenced = false;
export function silenceMediaPipeLogs() {
  if (mediaPipeLogsSilenced || typeof window === 'undefined') return;
  mediaPipeLogsSilenced = true;
  const original = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && MEDIAPIPE_LOG.test(args[0])) return;
    original(...args);
  };
}

// Bone connections between MediaPipe's 21 hand landmarks
const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];


// Upper body: shoulders, arms, hips
const POSE_CONNECTIONS: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24],
];
const FACE_POINTS = [0, 2, 5, 9, 10];

export type Landmark = { x: number; y: number };

/** Draws the tracked upper body and every detected hand over the video. */
export function drawBody(canvas: HTMLCanvasElement, video: HTMLVideoElement, pose: Landmark[] | null, hands: Landmark[][]) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const w = canvas.width;
  const h = canvas.height;
  const scale = Math.max(1, w / 640);
  ctx.lineCap = 'round';

  const lines = (points: Landmark[], connections: [number, number][], color: string, width: number) => {
    ctx.lineWidth = width * scale;
    ctx.strokeStyle = color;
    for (const [a, b] of connections) {
      if (!points[a] || !points[b]) continue;
      ctx.beginPath();
      ctx.moveTo(points[a].x * w, points[a].y * h);
      ctx.lineTo(points[b].x * w, points[b].y * h);
      ctx.stroke();
    }
  };
  const dots = (points: Landmark[], color: string, radius: number) => {
    ctx.fillStyle = color;
    for (const p of points) {
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, radius * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  if (pose) {
    lines(pose, POSE_CONNECTIONS, 'rgba(250, 204, 21, 0.85)', 4);
    dots(FACE_POINTS.map((i) => pose[i]).filter(Boolean), 'rgba(250, 204, 21, 0.95)', 4);
  }
  for (const hand of hands) {
    lines(hand, HAND_CONNECTIONS, 'rgba(89, 154, 255, 0.9)', 3);
    dots(hand, '#3aea80', 4);
  }
}

/** Single-hand overlay, as used by the fingerspelling studio. */
export function drawHand(canvas: HTMLCanvasElement, video: HTMLVideoElement, landmarks: Landmark[] | null) {
  drawBody(canvas, video, null, landmarks ? [landmarks] : []);
}

export type TrackerStatus = 'loading' | 'ready' | 'error';

/** Called for every processed camera frame with what MediaPipe saw. */
export type FrameHandler = (observation: BodyObservation, now: number) => void;

/**
 * Camera + MediaPipe pose and hand landmarkers for the admin training tools. Loads both models
 * once, runs them on each new video frame, draws the body and hands, and reports the result.
 */
export function useBodyTracker(onFrame: FrameHandler) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelsRef = useRef<{ hands: any; pose: any } | null>(null);
  const onFrameRef = useRef(onFrame);
  const [status, setStatus] = useState<TrackerStatus>('loading');
  const [cameraOn, setCameraOn] = useState(false);
  const [starting, setStarting] = useState(false);
  const [bodyVisible, setBodyVisible] = useState(false);
  const [handCount, setHandCount] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    silenceMediaPipeLogs();
    let cancelled = false;
    (async () => {
      try {
        const models = await loadBodyModels();
        if (cancelled) {
          models.hands.close();
          models.pose.close();
          return;
        }
        modelsRef.current = models;
        setStatus('ready');
      } catch (err) {
        console.error('Failed to load body tracking models:', err);
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
      modelsRef.current?.hands.close?.();
      modelsRef.current?.pose.close?.();
      modelsRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    setCameraOn(false);
    setBodyVisible(false);
    setHandCount(0);
  }, []);

  useEffect(() => stop, [stop]);

  const loop = useCallback(() => {
    let lastVideoTime = -1;
    let lastBody = false;
    let lastHands = 0;
    const tick = () => {
      const video = videoRef.current;
      if (!video || !streamRef.current) return;
      const models = modelsRef.current;
      if (models && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        try {
          const now = performance.now();
          const observation = detectBody(models, video, now);
          if (canvasRef.current) drawBody(canvasRef.current, video, observation.pose, observation.hands.map((h) => h.landmarks));
          const body = !!observation.pose;
          if (body !== lastBody) setBodyVisible((lastBody = body));
          if (observation.hands.length !== lastHands) setHandCount((lastHands = observation.hands.length));
          onFrameRef.current(observation, now);
        } catch {
          // The models may throw on the first frames while warming up
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(async () => {
    setError('');
    setStarting(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
      loop();
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      setError(
        name === 'NotAllowedError'
          ? 'Camera access was blocked. Allow camera access in your browser settings and try again.'
          : name === 'NotFoundError'
            ? 'No camera was found. Connect a camera and try again.'
            : name === 'NotReadableError'
              ? 'Your camera is being used by another app. Close it and try again.'
              : 'Could not start the camera in this browser.'
      );
      stop();
    } finally {
      setStarting(false);
    }
  }, [loop, stop]);

  return { videoRef, canvasRef, status, cameraOn, starting, bodyVisible, handCount, error, start, stop };
}

/** Loads the pose landmarker and a two-hand landmarker. */
export async function loadBodyModels() {
  const { HandLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
  const fileset = await FilesetResolver.forVisionTasks(TASKS_VISION_WASM);
  const [hands, pose] = await Promise.all([
    HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: 'CPU' },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    }),
    loadPoseModel(),
  ]);
  return { hands, pose };
}

/** Loads just the pose landmarker, for pages that already track hands themselves. */
export async function loadPoseModel() {
  const { PoseLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
  const fileset = await FilesetResolver.forVisionTasks(TASKS_VISION_WASM);
  return PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: 'CPU' },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function detectBody(models: { hands: any; pose: any }, video: HTMLVideoElement, now: number): BodyObservation {
  const handResult = models.hands.detectForVideo(video, now);
  const poseResult = models.pose.detectForVideo(video, now);
  return toObservation(video, poseResult?.landmarks?.[0] ?? null, handResult?.landmarks ?? [], handResult?.worldLandmarks ?? []);
}

/** Packs MediaPipe results into a BodyObservation. */
export function toObservation(video: HTMLVideoElement, pose: Point3[] | null, handLandmarks: Point3[][], handWorld: Point3[][]): BodyObservation {
  return {
    pose,
    hands: handLandmarks.map((landmarks, i) => ({ landmarks, world: handWorld[i] ?? [] })),
    aspect: video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9,
  };
}
