import Link from 'next/link';
import { Hand, Mic, Type } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { ThemeToggle } from '@/components/layout/theme-toggle';

const highlights = [
  { icon: <Hand />, text: 'Translate sign language to text and speech in real time' },
  { icon: <Mic />, text: 'Speak in Kinyarwanda, English or French and see it signed' },
  { icon: <Type />, text: 'Type any message and play it back sign by sign' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative flex flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Am Able home" className="rounded-lg">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
        <main id="main-content" className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </main>
        <p className="text-center text-xs text-subtle">
          By continuing you agree to our{' '}
          <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </div>

      <aside className="relative hidden overflow-hidden bg-slate-950 lg:block" aria-hidden="true">
        <div className="bg-brand-gradient absolute inset-0 opacity-80" />
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:26px_26px]" />
        <div className="absolute -left-20 top-1/4 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <p className="text-sm font-medium uppercase tracking-wider text-white/70">Am Able</p>
          <div>
            <h2 className="max-w-md text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl">
              Breaking communication barriers, one sign at a time.
            </h2>
            <ul className="mt-10 space-y-4">
              {highlights.map((h) => (
                <li key={h.text} className="flex items-center gap-4 text-white/90">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-inset ring-white/20 backdrop-blur [&_svg]:size-5">
                    {h.icon}
                  </span>
                  {h.text}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-white/60">Trusted by learners, families, schools and clinics.</p>
        </div>
      </aside>
    </div>
  );
}
