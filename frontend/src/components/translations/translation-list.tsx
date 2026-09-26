'use client';

import React, { useMemo, useState } from 'react';
import { Bookmark, BookmarkCheck, ChevronRight, Clock, Hand, Mic, Trash2, Type, Volume2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/feedback';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { SignPlayer } from '@/components/sign/sign-player';
import { formatRelativeTime, getErrorMessage } from '@/lib/utils';
import { useSignEngine } from '@/lib/use-sign-engine';
import { speak } from '@/lib/speech';
import { toast } from '@/store/toast-store';

export interface Translation {
  _id: string;
  inputType: 'sign-to-text' | 'text-to-sign' | 'voice-to-sign';
  inputContent: string;
  translatedText: string;
  confidenceScore: number;
  isSaved?: boolean;
  createdAt: string;
}

const typeMeta: Record<Translation['inputType'], { label: string; icon: React.ReactNode; tone: 'brand' | 'violet' | 'success' }> = {
  'sign-to-text': { label: 'Sign to text', icon: <Hand />, tone: 'brand' },
  'voice-to-sign': { label: 'Voice to sign', icon: <Mic />, tone: 'violet' },
  'text-to-sign': { label: 'Text to sign', icon: <Type />, tone: 'success' },
};

/** The words of a translation: what was signed, or what was typed or said. */
function translationText(t: Translation) {
  return t.inputType === 'sign-to-text' ? t.translatedText : t.inputContent;
}

function TranslationRow({ translation: t, onOpen }: { translation: Translation; onOpen: () => void }) {
  const meta = typeMeta[t.inputType] ?? typeMeta['sign-to-text'];
  const text = translationText(t);
  return (
    <li>
      <button
        onClick={onOpen}
        className="group flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-surface-muted"
        aria-label={`Open ${meta.label.toLowerCase()} translation: ${text || 'empty'}`}
      >
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
        {t.isSaved && <BookmarkCheck className="size-4 shrink-0 text-violet-500" aria-label="Saved" />}
        <Badge tone={meta.tone} className="hidden sm:inline-flex">
          {meta.label}
        </Badge>
        {t.confidenceScore > 0 && (
          <span className="w-12 text-right text-sm font-medium tabular-nums text-muted">{Math.round(t.confidenceScore * 100)}%</span>
        )}
        <ChevronRight className="size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" />
      </button>
    </li>
  );
}

interface TranslationDialogProps {
  translation: Translation | null;
  onClose: () => void;
  onSavedChange: (id: string, saved: boolean) => void;
  onDelete: (t: Translation) => void;
}

/** One past translation: replay its signs or hear it, save it, reopen it, or delete it. */
function TranslationDialog({ translation, onClose, onSavedChange, onDelete }: TranslationDialogProps) {
  const engine = useSignEngine();
  const [busy, setBusy] = useState(false);
  const text = translation ? translationText(translation) : '';
  const isSignToText = translation?.inputType === 'sign-to-text';
  const frames = useMemo(() => (engine && text && !isSignToText ? engine.textToSignFrames(text) : []), [engine, text, isSignToText]);
  const meta = translation ? (typeMeta[translation.inputType] ?? typeMeta['sign-to-text']) : null;

  const toggleSaved = async () => {
    if (!translation) return;
    const next = !translation.isSaved;
    setBusy(true);
    try {
      if (next) await api.translations.save(translation._id);
      else await api.translations.unsave(translation._id);
      onSavedChange(translation._id, next);
      toast.success(next ? 'Translation saved' : 'Removed from saved');
    } catch (err) {
      toast.error('Could not update translation', getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={!!translation}
      onClose={onClose}
      title={meta?.label ?? ''}
      description={translation ? new Date(translation.createdAt).toLocaleString() : undefined}
      size="lg"
      footer={
        translation && (
          <>
            <Button variant="ghost" className="mr-auto text-red-600 dark:text-red-400" onClick={() => onDelete(translation)}>
              <Trash2 />
              Delete
            </Button>
            <Button variant="outline" onClick={toggleSaved} isLoading={busy}>
              {translation.isSaved ? <BookmarkCheck /> : <Bookmark />}
              {translation.isSaved ? 'Saved' : 'Save'}
            </Button>
            {isSignToText ? (
              <Button onClick={() => speak(text)} disabled={!text}>
                <Volume2 />
                Speak aloud
              </Button>
            ) : (
              <Button href={`/dashboard/text-to-sign?text=${encodeURIComponent(text)}`}>
                <Type />
                Open in Text to Sign
              </Button>
            )}
          </>
        )
      }
    >
      {translation && (
        <div className="space-y-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-subtle">{isSignToText ? 'You signed' : 'Message'}</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-2xl font-semibold text-foreground">{text || '—'}</p>
            {isSignToText && (
              <p className="mt-1 text-sm text-muted">
                {translation.inputContent}
                {translation.confidenceScore > 0 && ` · ${Math.round(translation.confidenceScore * 100)}% confidence`}
              </p>
            )}
          </div>
          {!isSignToText &&
            (engine ? (
              <SignPlayer frames={frames} emptyIcon={<Hand />} emptyText="No signs for this message." />
            ) : (
              <Skeleton className="h-48 w-full rounded-xl" />
            ))}
        </div>
      )}
    </Modal>
  );
}

interface TranslationListProps {
  translations: Translation[];
  onSavedChange: (id: string, saved: boolean) => void;
  onDeleted: (id: string) => void;
}

/** A list of translations; each opens in a dialog where it can be replayed, saved or deleted. */
export function TranslationList({ translations, onSavedChange, onDeleted }: TranslationListProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Translation | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const open = translations.find((t) => t._id === openId) ?? null;

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.translations.delete(deleting._id);
      toast.success('Translation deleted');
      onDeleted(deleting._id);
      setDeleting(null);
    } catch (err) {
      toast.error('Could not delete translation', getErrorMessage(err));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <>
      <ul className="-mx-2 divide-y divide-border">
        {translations.map((t) => (
          <TranslationRow key={t._id} translation={t} onOpen={() => setOpenId(t._id)} />
        ))}
      </ul>

      <TranslationDialog
        translation={open}
        onClose={() => setOpenId(null)}
        onSavedChange={onSavedChange}
        onDelete={(t) => {
          setOpenId(null);
          setDeleting(t);
        }}
      />
      <ConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete this translation?"
        description="It will be removed from your recent and saved translations. This can't be undone."
        confirmLabel="Delete"
        destructive
        isLoading={deleteBusy}
      />
    </>
  );
}

/** Placeholder rows while translations load. */
export function TranslationListSkeleton() {
  return (
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
  );
}
