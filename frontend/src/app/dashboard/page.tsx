'use client';

import React from 'react';
import Link from 'next/link';
import { Activity, ArrowRight, ArrowUpRight, Bookmark, Clock, GraduationCap, Hand, History, Mic, Target, Type } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import { formatRelativeTime } from '@/lib/utils';
import { useApi } from '@/lib/hooks';

interface Stats {
  totalTranslations: number;
  savedTranslations: number;
  avgConfidence: number;
}

interface Translation {
  _id: string;
  inputType: 'sign-to-text' | 'text-to-sign' | 'voice-to-sign';
  inputContent: string;
  translatedText: string;
  confidenceScore: number;
  createdAt: string;
}

const modes = [
  {
    icon: <Hand />,
    title: 'Sign to Text',
    description: 'Use your camera to translate sign language into text and speech.',
    href: '/dashboard/translation',
    tone: 'from-brand-500 to-sky-500',
  },
  {
    icon: <Mic />,
    title: 'Voice to Sign',
    description: 'Speak and see your words turned into sign language.',
    href: '/dashboard/voice',
    tone: 'from-violet-500 to-fuchsia-500',
  },
  {
    icon: <Type />,
    title: 'Text to Sign',
    description: 'Type a message and play it back sign by sign.',
    href: '/dashboard/text-to-sign',
    tone: 'from-emerald-500 to-teal-500',
  },
  {
    icon: <GraduationCap />,
    title: 'Learn Sign Language',
    description: 'Lessons, 8,500+ signs, the alphabet and quizzes.',
    href: '/dashboard/learn',
    tone: 'from-amber-500 to-orange-500',
  },
];

const typeMeta: Record<Translation['inputType'], { label: string; icon: React.ReactNode; tone: 'brand' | 'violet' | 'success' }> = {
  'sign-to-text': { label: 'Sign to text', icon: <Hand />, tone: 'brand' },
  'voice-to-sign': { label: 'Voice to sign', icon: <Mic />, tone: 'violet' },
  'text-to-sign': { label: 'Text to sign', icon: <Type />, tone: 'success' },
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

async function fetchDashboard() {
  const [stats, translations] = await Promise.all([api.translations.getStats(), api.translations.getAll()]);
  return {
    stats: stats as Stats,
    recent: (Array.isArray(translations) ? translations.slice(0, 6) : []) as Translation[],
  };
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data, loading, error, reload: load } = useApi(fetchDashboard, 'Could not load your dashboard.');
  const stats = data?.stats;
  const recent = data?.recent ?? [];

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user?.name?.split(' ')[0] || 'there'}`}
        description="Pick a translation mode, keep learning sign language, or review your recent activity."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {modes.map((mode) => (
          <Link
            key={mode.href}
            href={mode.href}
            className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg hover:shadow-slate-900/5 dark:hover:border-brand-500/40 dark:hover:shadow-black/30"
          >
            <div
              className={`absolute -right-8 -top-8 size-28 rounded-full bg-gradient-to-br ${mode.tone} opacity-10 blur-xl transition-opacity group-hover:opacity-25`}
              aria-hidden="true"
            />
            <div className="flex items-start justify-between">
              <span className={`flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${mode.tone} text-white shadow-md [&_svg]:size-5`}>
                {mode.icon}
              </span>
              <ArrowUpRight className="size-5 text-subtle transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-600 dark:group-hover:text-brand-400" />
            </div>
            <h2 className="mt-4 font-semibold text-foreground">{mode.title}</h2>
            <p className="mt-1 text-sm text-muted">{mode.description}</p>
          </Link>
        ))}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} className="mt-6" />
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <StatCard label="Translations" value={stats?.totalTranslations ?? 0} icon={<Activity />} loading={loading} />
            <StatCard label="Saved" value={stats?.savedTranslations ?? 0} icon={<Bookmark />} tone="violet" loading={loading} />
            <StatCard
              label="Avg. confidence"
              value={`${Math.round((stats?.avgConfidence ?? 0) * 100)}%`}
              icon={<Target />}
              tone="emerald"
              loading={loading}
            />
          </div>

          <Card className="mt-6">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>
                <History className="size-4 text-subtle" />
                Recent translations
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-4">
              {loading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="size-9 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recent.length === 0 ? (
                <EmptyState
                  icon={<History />}
                  title="No translations yet"
                  description="Translations you save will show up here."
                  action={
                    <Button href="/dashboard/translation" size="sm">
                      Start translating
                      <ArrowRight />
                    </Button>
                  }
                  className="py-8"
                />
              ) : (
                <ul className="-mx-2 divide-y divide-border">
                  {recent.map((t) => {
                    const meta = typeMeta[t.inputType] ?? typeMeta['sign-to-text'];
                    const text = t.inputType === 'sign-to-text' ? t.translatedText : t.inputContent;
                    return (
                      <li key={t._id} className="flex items-center gap-3 px-2 py-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-muted [&_svg]:size-4">
                          {meta.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{text || '—'}</p>
                          <p className="flex items-center gap-1 text-xs text-subtle">
                            <Clock className="size-3" />
                            {formatRelativeTime(t.createdAt)}
                          </p>
                        </div>
                        <Badge tone={meta.tone} className="hidden sm:inline-flex">
                          {meta.label}
                        </Badge>
                        {t.confidenceScore > 0 && (
                          <span className="w-12 text-right text-sm font-medium tabular-nums text-muted">
                            {Math.round(t.confidenceScore * 100)}%
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
