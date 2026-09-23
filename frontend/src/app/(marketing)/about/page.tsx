import type { Metadata } from 'next';
import { Globe, Heart, Target, Users, Zap } from 'lucide-react';
import { Reveal } from '@/components/marketing/reveal';
import { CtaBanner, IconTile, PageHero, Section, SectionHeading } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'About',
  description: 'Our mission is to eliminate communication barriers between deaf and hearing communities.',
};

const values = [
  {
    icon: <Heart />,
    title: 'Empathy first',
    description: 'We design with a deep understanding of the challenges faced by the deaf and hard-of-hearing community.',
  },
  {
    icon: <Zap />,
    title: 'Innovation',
    description: 'We push the boundaries of AI to create solutions that were previously impossible.',
  },
  {
    icon: <Users />,
    title: 'Inclusivity',
    description: 'We build technology that brings people together, regardless of their abilities.',
  },
  {
    icon: <Globe />,
    title: 'Global impact',
    description: 'We are breaking communication barriers across 42 languages — and counting.',
  },
];

const stats = [
  { value: '125K+', label: 'Active users' },
  { value: '42', label: 'Languages' },
  { value: '99.2%', label: 'Accuracy' },
  { value: '<150ms', label: 'Latency' },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About us"
        title={
          <>
            Communication is a <span className="text-gradient">human right</span>
          </>
        }
        description="We're on a mission to break communication barriers and make the world more accessible for everyone."
      />

      <Section className="pt-4 sm:pt-4">
        <div className="grid items-start gap-12 lg:grid-cols-5">
          <Reveal className="lg:col-span-3">
            <IconTile>
              <Target />
            </IconTile>
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground">Our mission</h2>
            <div className="mt-5 space-y-5 text-lg leading-relaxed text-muted">
              <p>
                Am Able was founded with a simple but powerful vision: to eliminate communication barriers between deaf and
                hearing communities. We believe that everyone deserves equal access to information, opportunities, and human
                connection.
              </p>
              <p>
                By combining computer vision and speech technology, we&apos;ve built a platform that translates sign language in
                real time. Our technology doesn&apos;t just translate words — it aims to capture nuance and context, making
                communication truly natural and inclusive.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-2">
            <dl className="grid grid-cols-2 gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col-reverse rounded-2xl border border-border bg-surface p-6">
                  <dt className="mt-1 text-sm text-muted">{stat.label}</dt>
                  <dd className="font-display text-3xl font-bold tracking-tight text-foreground">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </Section>

      <Section muted>
        <SectionHeading eyebrow="What drives us" title="Our values" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((value, i) => (
            <Reveal key={value.title} delay={i * 0.06}>
              <div className="h-full rounded-2xl border border-border bg-background p-6">
                <IconTile>{value.icon}</IconTile>
                <h3 className="mt-5 font-semibold text-foreground">{value.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{value.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <div className="pt-20 sm:pt-24">
        <CtaBanner
          title="Join our mission"
          description="Be part of the movement to make communication accessible for everyone."
          primary={{ href: '/register', label: 'Get started free' }}
          secondary={{ href: '/contact', label: 'Get in touch' }}
        />
      </div>
    </>
  );
}
