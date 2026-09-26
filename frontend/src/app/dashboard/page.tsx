'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowRight, ArrowUpRight, Bookmark, ChevronDown, GraduationCap, Hand, History, Mic, Target, Type } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState } from '@/components/ui/feedback';
import { TranslationList, TranslationListSkeleton, type Translation } from '@/components/translations/translation-list';
import { useApi } from '@/lib/hooks';

interface Stats {
  totalTranslations: number;
  savedTranslations: number;
  avgConfidence: number;
}

/** Rows shown before "Show all". The API returns the latest 50. */
const RECENT_COUNT = 6;

const modes = [
  {
    icon: <Hand />,
    title: 'Sign to Text & Voice',
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
    recent: (Array.isArray(translations) ? translations : []) as Translation[],
  };
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data, loading, error, reload: load, mutate } = useApi(fetchDashboard, 'Could not load your dashboard.');
  const stats = data?.stats;
  const recent = data?.recent ?? [];
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? recent : recent.slice(0, RECENT_COUNT);

  const handleSavedChange = (id: string, saved: boolean) =>
    mutate((d) =>
      d && {
        stats: { ...d.stats, savedTranslations: Math.max(0, d.stats.savedTranslations + (saved ? 1 : -1)) },
        recent: d.recent.map((t) => (t._id === id ? { ...t, isSaved: saved } : t)),
      }
    );

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
            <StatCard
              label="Translations"
              value={stats?.totalTranslations ?? 0}
              icon={<Activity />}
              loading={loading}
              hint="Every translation you have made"
            />
            <StatCard
              label="Saved"
              value={stats?.savedTranslations ?? 0}
              icon={<Bookmark />}
              tone="violet"
              loading={loading}
              hint={
                <Link href="/dashboard/saved" className="inline-flex items-center gap-1 font-medium text-brand-600 hover:underline dark:text-brand-400">
                  View saved translations
                  <ArrowRight className="size-3" />
                </Link>
              }
            />
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
              <div className="flex items-center gap-1">
                {recent.length > RECENT_COUNT && (
                  <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)} aria-expanded={showAll}>
                    {showAll ? 'Show less' : `Show all (${recent.length})`}
                    <ChevronDown className={showAll ? 'rotate-180' : undefined} />
                  </Button>
                )}
                <Button variant="outline" size="sm" href="/dashboard/saved">
                  <Bookmark />
                  Saved
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-4">
              {loading ? (
                <TranslationListSkeleton />
              ) : recent.length === 0 ? (
                <EmptyState
                  icon={<History />}
                  title="No translations yet"
                  description="Translations you make will show up here."
                  action={
                    <Button href="/dashboard/translation" size="sm">
                      Start translating
                      <ArrowRight />
                    </Button>
                  }
                  className="py-8"
                />
              ) : (
                <TranslationList
                  translations={shown}
                  onSavedChange={handleSavedChange}
                  // Averages change too, so reload the stats rather than adjusting them here
                  onDeleted={load}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
