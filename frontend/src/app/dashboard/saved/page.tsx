'use client';

import React, { useMemo, useState } from 'react';
import { ArrowRight, Bookmark, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/app-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState, ErrorState } from '@/components/ui/feedback';
import { TranslationList, TranslationListSkeleton, type Translation } from '@/components/translations/translation-list';
import { useApi } from '@/lib/hooks';

interface SavedItem {
  _id: string;
  /** Populated by the API; null if the translation was deleted. */
  translationId: Translation | null;
}

async function fetchSaved() {
  const items = (await api.translations.getSaved()) as SavedItem[];
  return (Array.isArray(items) ? items : [])
    .flatMap((item) => (item.translationId ? [{ ...item.translationId, isSaved: true }] : []));
}

export default function SavedTranslationsPage() {
  const { data, loading, error, reload, mutate } = useApi(fetchSaved, 'Could not load your saved translations.');
  const [query, setQuery] = useState('');
  const saved = useMemo(() => data ?? [], [data]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return saved;
    return saved.filter((t) => `${t.inputContent} ${t.translatedText}`.toLowerCase().includes(q));
  }, [saved, query]);

  // Unsaving from here keeps the item visible (marked unsaved) until the page reloads, so it can be saved again
  const handleSavedChange = (id: string, isSaved: boolean) =>
    mutate((d) => d?.map((t) => (t._id === id ? { ...t, isSaved } : t)));
  const handleDeleted = (id: string) => mutate((d) => d?.filter((t) => t._id !== id));

  return (
    <>
      <PageHeader
        title="Saved translations"
        description="Translations you saved. Open one to replay its signs, hear it aloud, or use it again."
      />

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <Card>
          <CardContent className="space-y-4 pt-5 sm:pt-6">
            {saved.length > 0 && (
              <Input
                aria-label="Search saved translations"
                icon={<Search />}
                placeholder="Search your saved translations…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            )}
            {loading ? (
              <TranslationListSkeleton />
            ) : saved.length === 0 ? (
              <EmptyState
                icon={<Bookmark />}
                title="No saved translations yet"
                description="Press Save on any translation page, or open a recent translation and save it."
                action={
                  <Button href="/dashboard" size="sm">
                    Go to recent translations
                    <ArrowRight />
                  </Button>
                }
                className="py-8"
              />
            ) : shown.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">No saved translation matches “{query}”.</p>
            ) : (
              <TranslationList translations={shown} onSavedChange={handleSavedChange} onDeleted={handleDeleted} />
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
