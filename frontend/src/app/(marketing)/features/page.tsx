import type { Metadata } from 'next';
import { Brain, Camera, Check, Globe, Mic, Shield, Type, Users, Zap } from 'lucide-react';
import { Reveal } from '@/components/marketing/reveal';
import { CtaBanner, IconTile, PageHero, Section, SectionHeading } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'Features',
  description: 'Sign to text, text to sign and voice to sign translation — powered by AI.',
};

const features = [
  {
    icon: <Camera />,
    title: 'Sign to Text',
    description: 'Computer vision captures hand movements and translates sign language into text and speech instantly.',
    details: ['Real-time hand tracking', 'Confidence score for every sign', 'Automatic spoken output', 'Works with any webcam'],
    tone: 'from-brand-500 to-sky-500',
  },
  {
    icon: <Type />,
    title: 'Text to Sign',
    description: 'Type any message and watch it rendered sign-by-sign with a step-through player.',
    details: ['Live preview while typing', 'Adjustable playback speed', 'Step forward and back', 'Save to your history'],
    tone: 'from-emerald-500 to-teal-500',
  },
  {
    icon: <Mic />,
    title: 'Voice to Sign',
    description: 'Speech recognition converts spoken words into sign language as you talk, with a live mic level meter.',
    details: ['Kinyarwanda, English & French', 'Continuous listening', 'Live transcript', 'Replay as signs'],
    tone: 'from-violet-500 to-fuchsia-500',
  },
  {
    icon: <Brain />,
    title: 'AI that learns',
    description: 'Models continuously improve accuracy through community feedback and usage patterns.',
    details: ['Continuous learning', 'Community feedback', 'Pattern recognition', 'Adaptive models'],
    tone: 'from-amber-500 to-orange-500',
  },
];

const technical = [
  { icon: <Zap />, title: 'Lightning fast', description: 'Sub-150ms response time' },
  { icon: <Shield />, title: 'Private by design', description: 'Video is processed on your device' },
  { icon: <Globe />, title: 'Global coverage', description: '42 languages supported' },
  { icon: <Users />, title: 'Built to scale', description: 'Trusted by 125K+ users' },
];

export default function FeaturesPage() {
  return (
    <>
      <PageHero
        eyebrow="Features"
        title={
          <>
            Everything you need to <span className="text-gradient">communicate</span>
          </>
        }
        description="Seamless sign language communication, powered by modern AI and designed for everyone."
      />

      <Section className="pt-4 sm:pt-4">
        <div className="grid gap-6 md:grid-cols-2">
          {features.map((feature, i) => (
            <Reveal key={feature.title} delay={(i % 2) * 0.08}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-border bg-surface p-7 sm:p-8">
                <div
                  className={`absolute -right-12 -top-12 size-40 rounded-full bg-gradient-to-br ${feature.tone} opacity-10 blur-2xl transition-opacity group-hover:opacity-20`}
                  aria-hidden="true"
                />
                <div className={`flex size-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.tone} text-white shadow-lg [&_svg]:size-6`}>
                  {feature.icon}
                </div>
                <h2 className="mt-6 text-2xl font-semibold text-foreground">{feature.title}</h2>
                <p className="mt-2 leading-relaxed text-muted">{feature.description}</p>
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {feature.details.map((detail) => (
                    <li key={detail} className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="size-4 shrink-0 text-accent-600 dark:text-accent-400" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section muted>
        <SectionHeading
          eyebrow="Under the hood"
          title="Technical excellence"
          description="Built on reliable, modern technology for performance you can depend on."
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {technical.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.06}>
              <div className="h-full rounded-2xl border border-border bg-background p-6 text-center">
                <IconTile className="mx-auto">{item.icon}</IconTile>
                <h3 className="mt-4 font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1 text-sm text-muted">{item.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <div className="pt-20 sm:pt-24">
        <CtaBanner
          title="Ready to get started?"
          description="Join thousands of people who are already transforming how they communicate."
          primary={{ href: '/register', label: 'Create free account' }}
          secondary={{ href: '/pricing', label: 'View pricing' }}
        />
      </div>
    </>
  );
}
