'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { EpochStats } from './types';

interface Series {
  key: keyof EpochStats;
  name: string;
  /** Tailwind text colour; the line uses currentColor. */
  colorClass: string;
  dashed?: boolean;
}

interface Props {
  title: string;
  history: EpochStats[];
  series: Series[];
  /** Fixed y range, e.g. [0, 1] for accuracy. Defaults to 0..max. */
  domain?: [number, number];
  format: (v: number) => string;
  totalEpochs?: number;
  /** Epoch whose weights were kept, marked with a vertical rule. */
  markEpoch?: number;
}

const HEIGHT = 160;
const PAD = { top: 12, right: 12, bottom: 22, left: 40 };

/** Small line chart of per-epoch training metrics, with a hover crosshair. */
export function TrainingChart({ title, history, series, domain, format, totalEpochs, markEpoch }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const maxEpoch = Math.max(totalEpochs ?? 0, history.at(-1)?.epoch ?? 1, 2);
  const values = history.flatMap((h) => series.map((s) => h[s.key] as number)).filter(Number.isFinite);
  const [yMin, yMax] = domain ?? [0, Math.max(0.1, ...values) * 1.1];
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (epoch: number) => PAD.left + ((epoch - 1) / (maxEpoch - 1)) * plotW;
  const y = (v: number) => PAD.top + (1 - (Math.min(yMax, Math.max(yMin, v)) - yMin) / (yMax - yMin || 1)) * plotH;
  const ticks = [0, 0.5, 1].map((t) => yMin + t * (yMax - yMin));

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    if (!history.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const epoch = Math.round(1 + ((e.clientX - rect.left) / rect.width) * (maxEpoch - 1));
    const idx = history.findIndex((h) => h.epoch >= epoch);
    setHover(idx === -1 ? history.length - 1 : idx);
  };

  const point = hover !== null ? history[hover] : null;

  return (
    <figure className="min-w-0">
      <figcaption className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-subtle">{title}</span>
        <span className="flex flex-wrap items-center gap-3 text-xs text-muted">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <svg width="18" height="6" aria-hidden="true" className={s.colorClass}>
                <line x1="1" y1="3" x2="17" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray={s.dashed ? '4 3' : undefined} />
              </svg>
              {s.name}
            </span>
          ))}
        </span>
      </figcaption>
      <div ref={wrapRef} className="relative">
        {width > 0 && (
          <svg width={width} height={HEIGHT} role="img" aria-label={`${title} by epoch`} className="block overflow-visible">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} className="stroke-border" strokeWidth="1" />
                <text x={PAD.left - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-subtle text-[10px] tabular-nums">
                  {format(t)}
                </text>
              </g>
            ))}
            <text x={PAD.left} y={HEIGHT - 4} className="fill-subtle text-[10px]">
              epoch 1
            </text>
            <text x={width - PAD.right} y={HEIGHT - 4} textAnchor="end" className="fill-subtle text-[10px]">
              {maxEpoch}
            </text>

            {markEpoch && markEpoch <= (history.at(-1)?.epoch ?? 0) && (
              <line x1={x(markEpoch)} x2={x(markEpoch)} y1={PAD.top} y2={PAD.top + plotH} className="stroke-emerald-500" strokeWidth="1" strokeDasharray="2 3" />
            )}

            {series.map((s) =>
              history.length > 1 ? (
                <polyline
                  key={s.key}
                  points={history.map((h) => `${x(h.epoch)},${y(h[s.key] as number)}`).join(' ')}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray={s.dashed ? '5 4' : undefined}
                  className={s.colorClass}
                />
              ) : history.length === 1 ? (
                <circle key={s.key} cx={x(history[0].epoch)} cy={y(history[0][s.key] as number)} r="4" fill="currentColor" className={s.colorClass} />
              ) : null
            )}

            {point && (
              <g pointerEvents="none">
                <line x1={x(point.epoch)} x2={x(point.epoch)} y1={PAD.top} y2={PAD.top + plotH} className="stroke-muted" strokeWidth="1" />
                {series.map((s) => (
                  <circle
                    key={s.key}
                    cx={x(point.epoch)}
                    cy={y(point[s.key] as number)}
                    r="4.5"
                    fill="currentColor"
                    className={s.colorClass}
                    stroke="var(--surface)"
                    strokeWidth="2"
                  />
                ))}
              </g>
            )}

            <rect
              x={PAD.left}
              y={PAD.top}
              width={plotW}
              height={plotH}
              fill="transparent"
              onPointerMove={onMove}
              onPointerLeave={() => setHover(null)}
            />
          </svg>
        )}
        {point && (
          <div
            className="pointer-events-none absolute top-0 z-10 rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg"
            style={{
              left: Math.min(Math.max(0, x(point.epoch) + 10), Math.max(0, width - 150)),
            }}
          >
            <p className="mb-1 font-semibold text-foreground">Epoch {point.epoch}</p>
            {series.map((s) => (
              <p key={s.key} className="flex items-center justify-between gap-4 text-muted">
                <span>{s.name}</span>
                <span className="font-medium tabular-nums text-foreground">{format(point[s.key] as number)}</span>
              </p>
            ))}
          </div>
        )}
        {history.length === 0 && (
          <p className="flex h-[160px] items-center justify-center text-sm text-subtle">Waiting for the first epoch…</p>
        )}
      </div>
    </figure>
  );
}
