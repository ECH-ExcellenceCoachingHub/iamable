'use client';

import React from 'react';
import { Camera, CameraOff, Hand, Loader2, PersonStanding } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/feedback';
import { cn } from '@/lib/utils';
import type { useBodyTracker } from '@/lib/hand-tracking';

type Tracker = ReturnType<typeof useBodyTracker>;

/** Mirrored camera preview with the tracked body and hands drawn on top. `overlay` renders over the video. */
export function CameraView({ tracker, overlay, className }: { tracker: Tracker; overlay?: React.ReactNode; className?: string }) {
  const { videoRef, canvasRef, cameraOn, starting, status, bodyVisible, handCount, error, start, stop } = tracker;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-border">
        <video ref={videoRef} className="size-full -scale-x-100 object-cover" playsInline muted aria-label="Camera preview" />
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 size-full -scale-x-100 object-cover" aria-hidden="true" />

        {!cameraOn ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-900 to-slate-950 p-6 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-white/10 text-white [&_svg]:size-7">
              <Camera />
            </span>
            <p className="max-w-xs text-sm text-slate-300">Start the camera and stand so your head, shoulders and hands are in view.</p>
            <Button onClick={start} isLoading={starting}>
              <Camera />
              Start camera
            </Button>
          </div>
        ) : (
          <>
            <div className="absolute left-3 top-3 flex flex-wrap gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur',
                  bodyVisible ? 'bg-emerald-500/20 text-emerald-200' : 'bg-black/50 text-slate-300'
                )}
              >
                <PersonStanding className="size-3.5" />
                {bodyVisible ? 'Body tracked' : 'No body in view'}
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur',
                  handCount ? 'bg-emerald-500/20 text-emerald-200' : 'bg-black/50 text-slate-300'
                )}
              >
                <Hand className="size-3.5" />
                {handCount === 2 ? 'Both hands' : handCount === 1 ? '1 hand' : 'No hands'}
              </span>
              {status === 'loading' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-xs text-slate-300 backdrop-blur">
                  <Loader2 className="size-3.5 animate-spin" />
                  Loading body tracker
                </span>
              )}
            </div>
            <Button variant="white" size="sm" onClick={stop} className="absolute right-3 top-3">
              <CameraOff />
              Stop
            </Button>
            {overlay}
          </>
        )}
      </div>
      {error && <Alert>{error}</Alert>}
      {status === 'error' && <Alert>The body tracker could not load. Check your internet connection and reload the page.</Alert>}
    </div>
  );
}
