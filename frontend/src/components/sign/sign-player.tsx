'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Grid3X3, Maximize2, Pause, Play, RotateCcw } from 'lucide-react';
import type { SignFrame } from '@/lib/sign-images';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/feedback';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';

const SPEEDS = [
  { label: '0.5×', ms: 2400 },
  { label: '1×', ms: 1200 },
  { label: '1.5×', ms: 800 },
  { label: '2×', ms: 600 },
];

/** Word signs contain full movements, so they stay on screen longer than a single letter. */
const WORD_DURATION_FACTOR = 2.5;

function frameLabel(frame: SignFrame) {
  return frame.kind === 'word' ? (frame.source ?? frame.word) : frame.kind === 'letter' ? frame.char : '';
}

function frameCaption(frame: SignFrame) {
  if (frame.kind === 'space') return 'Word break';
  if (frame.kind === 'letter') return 'Fingerspelled';
  const gloss = frame.source ? ` · sign: ${frame.word.toUpperCase()}` : '';
  return (frame.mediaType === 'image' ? 'Illustrated sign — arrows show the movement' : 'Whole-word sign') + gloss;
}

export function SignImage({ frame, size }: { frame: SignFrame; size: 'sm' | 'lg' }) {
  const [failed, setFailed] = useState(false);

  if (frame.kind === 'space') {
    return (
      <div className="flex size-full items-center justify-center rounded-xl border-2 border-dashed border-border text-xs text-subtle">
        space
      </div>
    );
  }

  const mediaUrl = frame.kind === 'word' ? frame.mediaUrl : frame.imageUrl;
  if (!mediaUrl || failed) {
    const label = frameLabel(frame);
    return (
      <div className="bg-brand-gradient flex size-full items-center justify-center rounded-xl p-2">
        <span
          className={cn(
            'break-words text-center font-display font-bold text-white',
            frame.kind === 'word' ? (size === 'lg' ? 'text-4xl' : 'text-sm') : size === 'lg' ? 'text-7xl' : 'text-2xl'
          )}
        >
          {label}
        </span>
      </div>
    );
  }

  if (frame.kind === 'word' && frame.mediaType === 'video') {
    return (
      <video
        src={mediaUrl}
        autoPlay
        loop
        muted
        playsInline
        aria-label={`Sign for "${frame.word}"`}
        className="size-full rounded-xl bg-white object-contain"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={mediaUrl}
      alt={frame.kind === 'word' ? `Sign for "${frame.word}"` : `Sign for ${frame.char}`}
      loading="lazy"
      className="size-full rounded-xl bg-white object-contain"
      onError={() => setFailed(true)}
    />
  );
}

/** One sign shown large in a dialog, so it is easy to see and copy. */
export function SignZoom({ frame, onClose }: { frame: SignFrame | null; onClose: () => void }) {
  return (
    <Modal
      isOpen={!!frame && frame.kind !== 'space'}
      onClose={onClose}
      title={frame ? frameLabel(frame) : ''}
      description={frame ? frameCaption(frame) : undefined}
      size="xl"
    >
      {frame && (
        <div className="mx-auto aspect-square w-full max-w-[min(100%,65dvh)]">
          <SignImage frame={frame} size="lg" />
        </div>
      )}
    </Modal>
  );
}

interface SignPlayerProps {
  frames: SignFrame[];
  emptyIcon: React.ReactNode;
  emptyText: string;
}

/** Shows word signs and fingerspelling as a grid, with a step-through player. */
export const SignPlayer = ({ frames, emptyIcon, emptyText }: SignPlayerProps) => {
  const [mode, setMode] = useState<'grid' | 'player'>('grid');
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [zoomed, setZoomed] = useState<SignFrame | null>(null);
  const letters = frames.length;
  const safeIndex = Math.min(index, Math.max(0, letters - 1));

  // Reset playback when the text changes
  const [prevFrames, setPrevFrames] = useState(frames);
  if (prevFrames !== frames) {
    setPrevFrames(frames);
    setIndex(0);
    setPlaying(false);
    if (letters === 0) setMode('grid');
  }

  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => {
      if (safeIndex >= letters - 1) setPlaying(false);
      else setIndex(safeIndex + 1);
    }, SPEEDS[speed].ms * (frames[safeIndex]?.kind === 'word' ? WORD_DURATION_FACTOR : 1));
    return () => clearTimeout(id);
  }, [playing, safeIndex, letters, speed, frames]);

  const play = () => {
    setMode('player');
    if (safeIndex >= letters - 1) setIndex(0);
    setPlaying(true);
  };

  if (letters === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-8 text-center">
        <span className="mb-3 text-subtle [&_svg]:size-10">{emptyIcon}</span>
        <p className="text-sm text-muted">{emptyText}</p>
      </div>
    );
  }

  const current = frames[safeIndex];
  const hasWords = frames.some((f) => f.kind === 'word');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {playing ? (
          <Button onClick={() => setPlaying(false)}>
            <Pause />
            Pause
          </Button>
        ) : (
          <Button onClick={play}>
            <Play />
            {mode === 'player' && safeIndex > 0 && safeIndex < letters - 1 ? 'Resume' : 'Play signs'}
          </Button>
        )}
        <div className="flex rounded-xl bg-surface-muted p-1 ring-1 ring-inset ring-border" role="radiogroup" aria-label="Playback speed">
          {SPEEDS.map((s, i) => (
            <button
              key={s.label}
              role="radio"
              aria-checked={speed === i}
              onClick={() => setSpeed(i)}
              className={cn(
                'rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors',
                speed === i ? 'bg-surface text-foreground shadow-sm ring-1 ring-border' : 'text-muted hover:text-foreground'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          onClick={() => {
            setPlaying(false);
            setMode(mode === 'grid' ? 'player' : 'grid');
          }}
          aria-label={mode === 'grid' ? 'Show one sign at a time' : 'Show all signs'}
          title={mode === 'grid' ? 'Player view' : 'Grid view'}
        >
          {mode === 'grid' ? <Play /> : <Grid3X3 />}
        </Button>
      </div>

      {mode === 'player' ? (
        <div className="rounded-xl bg-surface-muted p-5 ring-1 ring-inset ring-border">
          <div className="relative mx-auto aspect-square w-full max-w-md">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${safeIndex}-${frameLabel(current)}`}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.15 }}
                className="size-full shadow-lg"
              >
                <SignImage frame={current} size="lg" />
              </motion.div>
            </AnimatePresence>
            {current.kind !== 'space' && (
              <Button
                variant="secondary"
                size="icon-sm"
                className="absolute right-2 top-2 shadow-md"
                onClick={() => {
                  setPlaying(false);
                  setZoomed(current);
                }}
                aria-label="Enlarge sign"
                title="Enlarge"
              >
                <Maximize2 />
              </Button>
            )}
          </div>
          <p className="mt-4 text-center font-display text-3xl font-bold text-foreground" aria-live="polite">
            {current.kind === 'space' ? '␣' : frameLabel(current)}
          </p>
          <p className="mt-1 text-center text-xs text-subtle">{frameCaption(current)}</p>
          <div className="mt-4 flex items-center gap-3">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => {
                setPlaying(false);
                setIndex(Math.max(0, safeIndex - 1));
              }}
              disabled={safeIndex === 0}
              aria-label="Previous sign"
            >
              <ChevronLeft />
            </Button>
            <Progress value={((safeIndex + 1) / letters) * 100} label="Playback progress" />
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => {
                setPlaying(false);
                setIndex(Math.min(letters - 1, safeIndex + 1));
              }}
              disabled={safeIndex >= letters - 1}
              aria-label="Next sign"
            >
              <ChevronRight />
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-subtle">
            <span>
              {safeIndex + 1} / {letters}
            </span>
            <button
              onClick={() => {
                setIndex(0);
                setPlaying(false);
              }}
              className="flex items-center gap-1 hover:text-foreground"
            >
              <RotateCcw className="size-3" /> Restart
            </button>
          </div>
        </div>
      ) : (
        <ul
          className={cn(
            'grid max-h-[40rem] gap-3 overflow-y-auto p-1 scrollbar-thin',
            hasWords ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-4 sm:grid-cols-6'
          )}
        >
          {frames.map((frame, i) => {
            if (frame.kind === 'space') {
              // Word signs are already separate tiles; only fingerspelled words need a break (a new row)
              const betweenLetters = frames[i - 1]?.kind === 'letter' && frames[i + 1]?.kind === 'letter';
              return betweenLetters ? <li key={`${i}-space`} className="col-span-full h-0" aria-hidden="true" /> : null;
            }
            return (
              <li key={`${i}-${frameLabel(frame)}`}>
                <button
                  onClick={() => {
                    setIndex(i);
                    setMode('player');
                  }}
                  className="group w-full text-center"
                  aria-label={`Sign ${frameLabel(frame)}, open in player`}
                >
                  <div
                    className={cn(
                      'aspect-square overflow-hidden rounded-xl shadow-sm transition-transform group-hover:scale-[1.04]',
                      frame.kind === 'word' ? 'ring-2 ring-brand-500' : 'ring-1 ring-border'
                    )}
                  >
                    <SignImage frame={frame} size="sm" />
                  </div>
                  <span
                    className={cn(
                      'mt-1.5 block truncate font-medium',
                      frame.kind === 'word' ? 'text-base text-foreground' : 'text-sm text-muted'
                    )}
                  >
                    {frameLabel(frame)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <SignZoom frame={zoomed} onClose={() => setZoomed(null)} />

      {hasWords && (
        <p className="text-[11px] leading-relaxed text-subtle">
          Signs are American Sign Language, from{' '}
          <a href="https://www.lifeprint.com" target="_blank" rel="noreferrer" className="underline hover:text-foreground">
            Lifeprint.com
          </a>{' '}
          (Dr. Bill Vicars) and{' '}
          <a href="https://aslsignbank.com" target="_blank" rel="noreferrer" className="underline hover:text-foreground">
            ASL Signbank
          </a>{' '}
          (Hochgesang, Crasborn &amp; Lillo-Martin,{' '}
          <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">
            CC BY-NC-SA 4.0
          </a>
          ).
        </p>
      )}
    </div>
  );
};
