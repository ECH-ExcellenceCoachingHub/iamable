'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CircleCheck,
  Globe,
  GraduationCap,
  HeartHandshake,
  Library,
  Lightbulb,
  Maximize2,
  RotateCcw,
  Search,
  Shuffle,
  SpellCheck,
  Trophy,
  Volume2,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress, Skeleton } from '@/components/ui/feedback';
import { Input } from '@/components/ui/input';
import { SignImage, SignPlayer, SignZoom } from '@/components/sign/sign-player';
import { useSignEngine } from '@/lib/use-sign-engine';
import { useDebouncedValue, useHydrated } from '@/lib/hooks';
import { speak } from '@/lib/speech';
import { cn } from '@/lib/utils';
import { useLearnStore } from '@/store/learn-store';
import { GESTURE_GUIDE } from '@/lib/sign-vocabulary';
import {
  ALL_WORDS,
  DEAF_AWARENESS_TIPS,
  LEARNING_TIPS,
  LESSONS,
  SIGN_LANGUAGES,
  type LessonWord,
} from '@/data/learning';

type Tab = 'lessons' | 'dictionary' | 'alphabet' | 'quiz' | 'awareness';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'lessons', label: 'Lessons', icon: <BookOpen /> },
  { id: 'dictionary', label: 'Sign dictionary', icon: <Library /> },
  { id: 'alphabet', label: 'Alphabet', icon: <SpellCheck /> },
  { id: 'quiz', label: 'Practice quiz', icon: <Trophy /> },
  { id: 'awareness', label: 'Deaf awareness', icon: <HeartHandshake /> },
];

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
const QUIZ_LENGTH = 10;
const DICTIONARY_PAGE_SIZE = 24;
/** Kinyarwanda words for lesson signs, so dictionary and quiz cards can show them too. */
const KINYARWANDA_FOR = new Map(ALL_WORDS.filter((w) => w.rw).map((w) => [w.en, w.rw]));
const withKinyarwanda = (en: string): LessonWord => ({ en, rw: KINYARWANDA_FOR.get(en) });

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---------------------------------------------------------------------------
// Shared

/** One sign shown as its GIF, video or illustration. */
function WordSign({ gloss, className }: { gloss: string; className?: string }) {
  const engine = useSignEngine();
  const frame = useMemo(() => engine?.signForWord(gloss) ?? null, [engine, gloss]);
  const [zoomed, setZoomed] = useState(false);
  return (
    <div className={cn('relative aspect-square overflow-hidden rounded-xl ring-1 ring-border', className)}>
      {frame ? <SignImage key={gloss} frame={frame} size="lg" /> : <Skeleton className="size-full rounded-xl" />}
      {frame && (
        <>
          <Button
            variant="secondary"
            size="icon-sm"
            className="absolute right-2 top-2 shadow-md"
            onClick={() => setZoomed(true)}
            aria-label="Enlarge sign"
            title="Enlarge"
          >
            <Maximize2 />
          </Button>
          <SignZoom frame={zoomed ? frame : null} onClose={() => setZoomed(false)} />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lessons

function WordCard({ word }: { word: LessonWord }) {
  const learned = useLearnStore((s) => s.learned.includes(word.en));
  const toggleLearned = useLearnStore((s) => s.toggleLearned);
  const hydrated = useHydrated();
  const isLearned = hydrated && learned;

  return (
    <li>
      <Card className={cn('h-full overflow-hidden p-3', isLearned && 'ring-2 ring-emerald-500/60')}>
        <WordSign gloss={word.en} />
        <div className="mt-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-display text-lg font-bold capitalize text-foreground">{word.en}</p>
            {word.rw && (
              <p className="text-sm text-muted">
                <span className="sr-only">Kinyarwanda: </span>
                <span lang="rw">{word.rw}</span>
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => speak(word.en)} aria-label={`Say "${word.en}" aloud`} title="Say aloud">
            <Volume2 />
          </Button>
        </div>
        {word.note && <p className="mt-1.5 text-xs leading-relaxed text-subtle">{word.note}</p>}
        <Button
          variant={isLearned ? 'outline' : 'secondary'}
          size="sm"
          className="mt-3 w-full"
          onClick={() => toggleLearned(word.en)}
          aria-pressed={isLearned}
        >
          <CircleCheck className={cn(isLearned && 'text-emerald-600 dark:text-emerald-400')} />
          {isLearned ? 'Learned' : 'Mark as learned'}
        </Button>
      </Card>
    </li>
  );
}

function LessonsTab() {
  const [lessonId, setLessonId] = useState(LESSONS[0].id);
  const learned = useLearnStore((s) => s.learned);
  const hydrated = useHydrated();
  const lesson = LESSONS.find((l) => l.id === lessonId) ?? LESSONS[0];
  const countLearned = (words: LessonWord[]) => (hydrated ? words.filter((w) => learned.includes(w.en)).length : 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
      <nav aria-label="Lessons">
        <ul className="space-y-1.5">
          {LESSONS.map((l, i) => {
            const done = countLearned(l.words);
            const active = l.id === lesson.id;
            return (
              <li key={l.id}>
                <button
                  onClick={() => setLessonId(l.id)}
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
                    active
                      ? 'border-brand-300 bg-brand-50 dark:border-brand-500/40 dark:bg-brand-500/10'
                      : 'border-border bg-surface hover:bg-surface-muted'
                  )}
                >
                  <span className="text-2xl" aria-hidden="true">
                    {l.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {i + 1}. {l.title}
                    </span>
                    <span className="mt-1 flex items-center gap-2">
                      <Progress value={(done / l.words.length) * 100} className="h-1.5" label={`${l.title} progress`} />
                      <span className="shrink-0 text-[11px] tabular-nums text-subtle">
                        {done}/{l.words.length}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <section aria-labelledby="lesson-title">
        <div className="mb-4">
          <h2 id="lesson-title" className="flex items-center gap-2 text-xl font-bold text-foreground">
            <span aria-hidden="true">{lesson.emoji}</span>
            {lesson.title}
          </h2>
          <p className="mt-1 text-sm text-muted">{lesson.description} Watch each sign a few times, copy it, then mark it as learned.</p>
        </div>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {lesson.words.map((word) => (
            <WordCard key={word.en} word={word} />
          ))}
        </ul>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dictionary

function DictionaryTab() {
  const engine = useSignEngine();
  const [query, setQuery] = useState('');
  const [initial, setInitial] = useState('');
  const [limit, setLimit] = useState(DICTIONARY_PAGE_SIZE);
  const debounced = useDebouncedValue(query.trim().toLowerCase(), 200);

  // Reset paging when the search changes
  const [prevSearch, setPrevSearch] = useState(`${debounced}|${initial}`);
  if (prevSearch !== `${debounced}|${initial}`) {
    setPrevSearch(`${debounced}|${initial}`);
    setLimit(DICTIONARY_PAGE_SIZE);
  }

  const results = useMemo(() => {
    if (!engine) return [];
    const glosses = engine.SIGN_GLOSSES;
    if (!debounced) return initial ? glosses.filter((g) => g.startsWith(initial)) : glosses;
    // Signs for the whole search, which also finds Kinyarwanda words ("amazi" → water)
    const translated = engine
      .textToSignFrames(debounced)
      .flatMap((f) => (f.kind === 'word' ? [f.word] : []));
    const starts = glosses.filter((g) => g.startsWith(debounced));
    const contains = glosses.filter((g) => !g.startsWith(debounced) && g.includes(debounced));
    return [...new Set([...translated, ...starts, ...contains])];
  }, [engine, debounced, initial]);

  return (
    <div className="space-y-5">
      <Card className="p-4 sm:p-5">
        <Input
          aria-label="Search signs"
          icon={<Search />}
          placeholder="Search in English or Kinyarwanda, e.g. water, amazi, thank you…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {!query && (
          <div className="mt-3 flex flex-wrap gap-1" role="radiogroup" aria-label="Browse by first letter">
            {['', ...ALPHABET].map((letter) => (
              <button
                key={letter || 'all'}
                role="radio"
                aria-checked={initial === letter}
                onClick={() => setInitial(letter)}
                className={cn(
                  'min-w-8 rounded-lg px-2 py-1 text-xs font-semibold uppercase transition-colors',
                  initial === letter ? 'bg-brand-600 text-white' : 'text-muted hover:bg-surface-muted hover:text-foreground'
                )}
              >
                {letter || 'All'}
              </button>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-subtle" aria-live="polite">
          {engine
            ? `${results.length.toLocaleString()} of ${engine.SIGN_COUNT.toLocaleString()} signs`
            : 'Loading the sign dictionary…'}
        </p>
      </Card>

      {engine && results.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="font-medium text-foreground">No sign found for “{query}”</p>
          <p className="mt-1 text-sm text-muted">Try a simpler word, or learn to fingerspell it in the Alphabet tab.</p>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.slice(0, limit).map((gloss) => (
            <WordCard key={gloss} word={withKinyarwanda(gloss)} />
          ))}
        </ul>
      )}

      {results.length > limit && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setLimit(limit + DICTIONARY_PAGE_SIZE * 2)}>
            Show more ({(results.length - limit).toLocaleString()} left)
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alphabet

function AlphabetTab() {
  const engine = useSignEngine();
  const [name, setName] = useState('');
  const letters = useMemo(() => engine?.fingerspellFrames(ALPHABET.split('').join(' ')).filter((f) => f.kind === 'letter') ?? [], [engine]);
  const spelled = useMemo(() => engine?.fingerspellFrames(name) ?? [], [engine, name]);

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>
            <SpellCheck className="size-4 text-subtle" />
            The manual alphabet
          </CardTitle>
          <CardDescription>
            One hand shape per letter (ASL). Use it to spell names, places and words you don’t know the sign for yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-7">
            {(letters.length ? letters : ALPHABET.split('').map(() => null)).map((frame, i) => (
              <li key={i} className="text-center">
                <div className="aspect-square overflow-hidden rounded-xl ring-1 ring-border">
                  {frame ? <SignImage frame={frame} size="sm" /> : <Skeleton className="size-full rounded-xl" />}
                </div>
                <span className="mt-1 block text-sm font-semibold text-foreground">{ALPHABET[i].toUpperCase()}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>
            <GraduationCap className="size-4 text-subtle" />
            Spell your name
          </CardTitle>
          <CardDescription>A great first exercise: type your name and practise spelling it, letter by letter.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            aria-label="Name or word to fingerspell"
            placeholder="e.g. Aline"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
          />
          <SignPlayer frames={spelled} emptyIcon={<SpellCheck />} emptyText="Type a name or word to see it fingerspelled." />
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quiz

interface Question {
  answer: LessonWord;
  options: LessonWord[];
}

function makeQuiz(pool: LessonWord[]): Question[] {
  return shuffle(pool)
    .slice(0, QUIZ_LENGTH)
    .map((answer) => ({
      answer,
      options: shuffle([answer, ...shuffle(ALL_WORDS.filter((w) => w.en !== answer.en)).slice(0, 3)]),
    }));
}

function QuizTab() {
  const learned = useLearnStore((s) => s.learned);
  const quizBest = useLearnStore((s) => s.quizBest);
  const recordQuizScore = useLearnStore((s) => s.recordQuizScore);
  const hydrated = useHydrated();
  const [scope, setScope] = useState<string>('all');
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const learnedWords = learned.map(withKinyarwanda);
  const scopes = [
    { id: 'all', label: 'All signs', words: ALL_WORDS },
    ...(hydrated && learnedWords.length >= 4 ? [{ id: 'learned', label: 'My learned signs', words: learnedWords }] : []),
    ...LESSONS.map((l) => ({ id: l.id, label: l.title, words: l.words })),
  ];
  const pool = (scopes.find((s) => s.id === scope) ?? scopes[0]).words;

  const start = () => {
    setQuestions(makeQuiz(pool));
    setIndex(0);
    setPicked(null);
    setScore(0);
  };

  const choose = (option: LessonWord) => {
    if (!questions || picked) return;
    setPicked(option.en);
    if (option.en === questions[index].answer.en) setScore((s) => s + 1);
  };

  const next = () => {
    if (!questions) return;
    if (index + 1 >= questions.length) {
      recordQuizScore(Math.round((score / questions.length) * 100));
      setIndex(questions.length);
    } else {
      setIndex(index + 1);
    }
    setPicked(null);
  };

  if (!questions) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle>
            <Trophy className="size-4 text-subtle" />
            Test yourself
          </CardTitle>
          <CardDescription>
            Watch a sign and choose what it means. {QUIZ_LENGTH} questions per round.
            {hydrated && quizBest > 0 && ` Your best score: ${quizBest}%.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-subtle">Practise</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Quiz topic">
              {scopes.map((s) => (
                <button
                  key={s.id}
                  role="radio"
                  aria-checked={scope === s.id}
                  onClick={() => setScope(s.id)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-sm transition-colors',
                    scope === s.id
                      ? 'border-brand-500 bg-brand-50 font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                      : 'border-border bg-surface text-muted hover:text-foreground'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={start} className="w-full">
            <Shuffle />
            Start quiz
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (index >= questions.length) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <Card className="mx-auto max-w-xl text-center">
        <CardContent className="py-10">
          <div className="text-5xl" aria-hidden="true">
            {pct >= 80 ? '🏆' : pct >= 50 ? '👏' : '💪'}
          </div>
          <h2 className="mt-4 text-2xl font-bold text-foreground" aria-live="polite">
            {score} / {questions.length} correct
          </h2>
          <p className="mt-1 text-muted">
            {pct >= 80 ? 'Excellent signing!' : pct >= 50 ? 'Good progress — keep practising.' : 'Every sign you practise counts. Review the lessons and try again.'}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button onClick={start}>
              <RotateCcw />
              Play again
            </Button>
            <Button variant="outline" onClick={() => setQuestions(null)}>
              Change topic
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const question = questions[index];
  const correct = picked === question.answer.en;

  return (
    <Card className="mx-auto max-w-xl">
      <CardContent className="space-y-5">
        <div className="flex items-center gap-3">
          <Progress value={(index / questions.length) * 100} label="Quiz progress" />
          <span className="shrink-0 text-sm tabular-nums text-muted">
            {index + 1}/{questions.length}
          </span>
        </div>
        <p className="text-center font-semibold text-foreground">What does this sign mean?</p>
        <WordSign gloss={question.answer.en} className="mx-auto w-full max-w-md" />
        <div className="grid grid-cols-2 gap-2">
          {question.options.map((option) => {
            const isAnswer = option.en === question.answer.en;
            const isPicked = option.en === picked;
            return (
              <button
                key={option.en}
                onClick={() => choose(option)}
                disabled={!!picked}
                className={cn(
                  'rounded-xl border px-3 py-3 text-sm font-semibold capitalize transition-colors',
                  !picked && 'border-border bg-surface text-foreground hover:border-brand-400 hover:bg-surface-muted',
                  picked && isAnswer && 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200',
                  picked && isPicked && !isAnswer && 'border-red-500 bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-200',
                  picked && !isAnswer && !isPicked && 'border-border text-subtle'
                )}
              >
                {option.en}
                {option.rw && <span className="block text-xs font-normal normal-case opacity-75">{option.rw}</span>}
              </button>
            );
          })}
        </div>
        {picked && (
          <div className="flex items-center justify-between gap-3" aria-live="polite">
            <p className={cn('flex items-center gap-1.5 text-sm font-medium', correct ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
              {correct ? <CircleCheck className="size-4" /> : <X className="size-4" />}
              {correct ? 'Correct!' : `It means “${question.answer.en}”.`}
            </p>
            <Button onClick={next} size="sm">
              {index + 1 >= questions.length ? 'See results' : 'Next'}
              <ArrowRight />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Deaf awareness

function AwarenessTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <HeartHandshake className="size-4 text-subtle" />
            Communicating with Deaf people
          </CardTitle>
          <CardDescription>Simple habits that make conversations easier and more respectful.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DEAF_AWARENESS_TIPS.map((tip) => (
              <li key={tip.title} className="rounded-xl bg-surface-muted p-4 ring-1 ring-inset ring-border">
                <p className="font-semibold text-foreground">{tip.title}</p>
                <p className="mt-1 text-sm text-muted">{tip.body}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <Globe className="size-4 text-subtle" />
            Sign languages around the world
          </CardTitle>
          <CardDescription>
            Sign language is not universal: there are more than 300 sign languages, each a full language with its own grammar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SIGN_LANGUAGES.map((language) => (
              <li key={language.short} className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-foreground">{language.name}</p>
                  {language.inApp ? <Badge tone="brand">In Am Able</Badge> : <Badge>{language.short}</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-subtle">{language.region}</p>
                <p className="mt-2 text-sm text-muted">{language.description}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <GraduationCap className="size-4 text-subtle" />
            Gestures the camera understands
          </CardTitle>
          <CardDescription>
            These 7 gestures, plus the ASL alphabet (all letters except J and Z) in Sign to Text&apos;s Fingerspelling mode — so you can
            spell any word.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {GESTURE_GUIDE.map((g) => (
              <li key={g.gesture} className="rounded-xl bg-surface-muted p-3 text-center ring-1 ring-inset ring-border">
                <span className="text-3xl" aria-hidden="true">
                  {g.emoji}
                </span>
                <p className="mt-1 text-xs font-semibold text-foreground">{g.gesture}</p>
                <p className="text-xs text-muted">{g.word}</p>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button href="/dashboard/translation" size="sm">
              Try Sign to Text
              <ArrowRight />
            </Button>
            <Button href="/dashboard/text-to-sign" size="sm" variant="outline">
              Translate a sentence
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function LearnPage() {
  const [tab, setTab] = useState<Tab>('lessons');
  const learned = useLearnStore((s) => s.learned);
  const reset = useLearnStore((s) => s.reset);
  const hydrated = useHydrated();
  const learnedCount = hydrated ? ALL_WORDS.filter((w) => learned.includes(w.en)).length : 0;

  return (
    <>
      <PageHeader
        title="Learn Sign Language"
        description="Visual, step-by-step lessons for Deaf learners, family, friends and anyone who wants to connect."
        actions={
          hydrated && learnedCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (window.confirm('Reset all your learning progress?')) reset();
              }}
            >
              <RotateCcw />
              Reset progress
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="p-5 md:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted">Your progress</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {learnedCount} <span className="text-base font-medium text-muted">of {ALL_WORDS.length} lesson signs learned</span>
              </p>
              {hydrated && learned.length > learnedCount && (
                <p className="mt-0.5 text-xs text-subtle">+ {learned.length - learnedCount} from the sign dictionary</p>
              )}
            </div>
            <GraduationCap className="size-10 text-brand-500" aria-hidden="true" />
          </div>
          <Progress value={(learnedCount / ALL_WORDS.length) * 100} className="mt-4" label="Overall learning progress" />
        </Card>
        <Card className="p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Lightbulb className="size-4 text-amber-500" />
            Tip
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">{LEARNING_TIPS[learnedCount % LEARNING_TIPS.length].title}</p>
          <p className="mt-0.5 text-sm text-muted">{LEARNING_TIPS[learnedCount % LEARNING_TIPS.length].body}</p>
        </Card>
      </div>

      <div
        role="tablist"
        aria-label="Learning sections"
        className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-surface-muted p-1 ring-1 ring-inset ring-border scrollbar-thin"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors [&_svg]:size-4',
              tab === t.id ? 'bg-surface text-foreground shadow-sm ring-1 ring-border' : 'text-muted hover:text-foreground'
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'lessons' && <LessonsTab />}
        {tab === 'dictionary' && <DictionaryTab />}
        {tab === 'alphabet' && <AlphabetTab />}
        {tab === 'quiz' && <QuizTab />}
        {tab === 'awareness' && <AwarenessTab />}
      </div>

      <p className="mt-8 text-[11px] leading-relaxed text-subtle">
        Signs shown are American Sign Language, from Lifeprint.com (Dr. Bill Vicars) and ASL Signbank (CC BY-NC-SA 4.0).
        Kinyarwanda words are shown for reference; Rwandan Sign Language may use different signs.
      </p>
    </>
  );
}
