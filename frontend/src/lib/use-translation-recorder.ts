'use client';

import { useCallback, useEffect, useRef } from 'react';
import { api } from '@/lib/api';

export interface TranslationDraft {
  inputType: 'sign-to-text' | 'text-to-sign' | 'voice-to-sign';
  inputContent: string;
  translatedText: string;
  confidenceScore?: number;
}

interface Recorded {
  id: string;
  draft: TranslationDraft;
  saved: boolean;
}

/** How long the output must stay unchanged before it is recorded in history. */
const RECORD_DELAY_MS = 2500;

const draftText = (d: TranslationDraft) => (d.inputType === 'sign-to-text' ? d.translatedText : d.inputContent);

const sameDraft = (a: TranslationDraft, b: TranslationDraft) =>
  a.inputType === b.inputType &&
  a.inputContent === b.inputContent &&
  a.translatedText === b.translatedText &&
  a.confidenceScore === b.confidenceScore;

/** The user kept going (or trimmed the end) rather than starting a new translation. */
function continues(prev: TranslationDraft, next: TranslationDraft) {
  if (prev.inputType !== next.inputType) return false;
  if (next.inputType === 'sign-to-text' && prev.inputContent !== next.inputContent) return false;
  const a = draftText(prev);
  const b = draftText(next);
  return a.startsWith(b) || b.startsWith(a);
}

/**
 * Records every translation the user makes in their history, once the output settles, so the
 * dashboard counts all of them. Continuing the same translation updates its record instead of
 * adding another. `save()` bookmarks the current translation. Pass `null` while there is nothing
 * to record; it also marks the end of a translation. `skip` is a draft not to record, such as a
 * past translation reopened from the dashboard.
 */
export function useTranslationRecorder(draft: TranslationDraft | null, skip?: TranslationDraft | null) {
  const recorded = useRef<Recorded | null>(null);
  // Records are written one at a time, so an update never races the create before it
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const latest = useRef(draft);
  const skipRef = useRef(skip);
  useEffect(() => {
    latest.current = draft;
  });

  const enqueue = useCallback(<T>(task: () => Promise<T>) => {
    const result = queue.current.then(task);
    queue.current = result.catch(() => {});
    return result;
  }, []);

  const record = useCallback(
    (d: TranslationDraft) =>
      enqueue(async (): Promise<Recorded> => {
        const prev = recorded.current;
        if (prev && sameDraft(prev.draft, d)) return prev;
        // Saved translations stay as they were saved; further changes start a new one
        if (prev && !prev.saved && continues(prev.draft, d)) {
          const { inputContent, translatedText, confidenceScore } = d;
          await api.translations.update(prev.id, { inputContent, translatedText, confidenceScore });
          recorded.current = { ...prev, draft: d };
        } else {
          const created = (await api.translations.create(d)) as { _id: string };
          recorded.current = { id: created._id, draft: d, saved: false };
        }
        return recorded.current;
      }),
    [enqueue]
  );

  const draftKey = draft ? JSON.stringify(draft) : '';
  useEffect(() => {
    if (!draftKey) {
      // Cleared: whatever comes next is a new translation
      enqueue(async () => {
        recorded.current = null;
      });
      return;
    }
    const d = JSON.parse(draftKey) as TranslationDraft;
    if (skipRef.current && sameDraft(skipRef.current, d)) return;
    skipRef.current = null;
    const id = setTimeout(() => record(d).catch(() => {}), RECORD_DELAY_MS);
    return () => clearTimeout(id);
  }, [draftKey, record, enqueue]);

  // Leaving the page before the output settled still records it
  useEffect(
    () => () => {
      const d = latest.current;
      if (d && !(skipRef.current && sameDraft(skipRef.current, d))) record(d).catch(() => {});
    },
    [record]
  );

  /** Record the current translation now, if needed, and bookmark it. */
  const save = useCallback(async () => {
    const d = latest.current;
    if (!d) return;
    const rec = await record(d);
    if (rec.saved) return;
    await api.translations.save(rec.id);
    if (recorded.current?.id === rec.id) recorded.current = { ...recorded.current, saved: true };
  }, [record]);

  return { save };
}
