'use client';

import React, { useMemo, useState } from 'react';
import { Hand, RotateCcw, Save, Type, Volume2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/input';
import { SignPlayer } from '@/components/sign/sign-player';
import { useSignEngine } from '@/lib/use-sign-engine';
import { speak } from '@/lib/speech';
import { api } from '@/lib/api';
import { toast } from '@/store/toast-store';
import { useDebouncedValue } from '@/lib/hooks';
import { getErrorMessage } from '@/lib/utils';

const MAX_LENGTH = 200;
const EXAMPLES = ['Hello, how are you?', 'Nice to meet you', 'I need a doctor', 'Muraho, amakuru?', 'Ndashaka amazi', 'Murakoze cyane'];

export default function TextToSignPage() {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const debounced = useDebouncedValue(text, 250);
  const engine = useSignEngine();
  const frames = useMemo(() => engine?.textToSignFrames(debounced) ?? [], [engine, debounced]);

  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await api.translations.create({
        inputType: 'text-to-sign',
        inputContent: text.trim(),
        translatedText: engine ? `Signed (${engine.describeFrames(engine.textToSignFrames(text))}): ${text.trim()}` : text.trim(),
        confidenceScore: 1,
      });
      toast.success('Translation saved', 'You can find it in your recent translations.');
    } catch (err) {
      toast.error('Could not save translation', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Text to Sign" description="Type a message and see it in sign language, with animated signs for whole words." />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              <Type className="size-4 text-subtle" />
              Your message
            </CardTitle>
            <CardDescription>
              Write in English or Kinyarwanda.{' '}
              {engine ? `${engine.SIGN_COUNT.toLocaleString()} signs in the dictionary; other words are fingerspelled.` : 'Loading the sign dictionary…'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Textarea
                aria-label="Text to convert"
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
                placeholder="Type your message here…"
                rows={6}
              />
              <p className="mt-1.5 text-right text-xs tabular-nums text-subtle">
                {text.length}/{MAX_LENGTH}
              </p>
            </div>

            {!text && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-subtle">Try an example</p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLES.map((example) => (
                    <button
                      key={example}
                      onClick={() => setText(example)}
                      className="rounded-full border border-border bg-surface px-3 py-1 text-sm text-muted transition-colors hover:border-brand-300 hover:text-foreground dark:hover:border-brand-500/40"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => speak(text)} disabled={!text.trim()}>
                <Volume2 />
                Speak
              </Button>
              <Button onClick={handleSave} disabled={!text.trim()} isLoading={saving}>
                {!saving && <Save />}
                Save
              </Button>
              <Button variant="ghost" onClick={() => setText('')} disabled={!text} className="ml-auto">
                <RotateCcw />
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>
              <Hand className="size-4 text-subtle" />
              Sign language
            </CardTitle>
            <CardDescription>
              {frames.length
                ? `${engine?.describeFrames(frames)}. Common words play as animated signs; other words are fingerspelled.`
                : 'Common words play as animated signs; other words are fingerspelled.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignPlayer frames={frames} emptyIcon={<Hand />} emptyText="Type something to see it in sign language." />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
