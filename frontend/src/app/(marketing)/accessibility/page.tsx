import type { Metadata } from 'next';
import { CheckCircle, Eye, Keyboard, Moon, Text, Volume2 } from 'lucide-react';
import { Reveal } from '@/components/marketing/reveal';
import { CtaBanner, IconTile, PageHero, Section, SectionHeading } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'Accessibility',
  description: 'Accessibility is at the core of everything we build.',
};

const features = [
  {
    icon: <CheckCircle />,
    title: 'Built to WCAG 2.1 AA',
    description: 'We design against Web Content Accessibility Guidelines 2.1 Level AA to ensure equal access for all users.',
  },
  {
    icon: <Keyboard />,
    title: 'Keyboard navigation',
    description: 'Full keyboard support with a logical tab order, a skip link, and an enhanced focus indicator you can switch on.',
  },
  {
    icon: <Volume2 />,
    title: 'Screen reader friendly',
    description: 'Semantic markup and ARIA labels so JAWS, NVDA and VoiceOver announce every control clearly.',
  },
  {
    icon: <Eye />,
    title: 'High contrast mode',
    description: 'A built-in high contrast setting strengthens text and borders for users with low vision.',
  },
  {
    icon: <Text />,
    title: 'Larger text',
    description: 'Increase the base text size across the whole app without breaking the layout.',
  },
  {
    icon: <Moon />,
    title: 'Dark mode & reduced motion',
    description: 'Choose light, dark or system theme, and turn off animations for a calmer experience.',
  },
];

export default function AccessibilityPage() {
  return (
    <>
      <PageHero
        eyebrow="Accessibility"
        title={
          <>
            Accessibility at our <span className="text-gradient">core</span>
          </>
        }
        description="Technology should be accessible to everyone. Our platform is designed with inclusivity in mind from the ground up."
      />

      <Section className="pt-0 sm:pt-0">
        <Reveal className="mx-auto max-w-3xl rounded-3xl border border-border bg-surface p-8 text-center sm:p-10">
          <p className="text-lg leading-relaxed text-muted">
            At Am Able, accessibility isn&apos;t an afterthought — it&apos;s fundamental to our mission. As a sign language
            translation platform, we understand the importance of removing barriers. That&apos;s why we&apos;ve built our entire
            product with accessibility as a primary design principle, so deaf, hard-of-hearing, and hearing users alike can
            communicate seamlessly.
          </p>
        </Reveal>
      </Section>

      <Section muted>
        <SectionHeading
          eyebrow="Features"
          title="Designed for every user"
          description="Adjust these settings anytime from the accessibility menu in your dashboard settings."
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <Reveal key={feature.title} delay={(i % 3) * 0.06}>
              <div className="h-full rounded-2xl border border-border bg-background p-6">
                <IconTile>{feature.icon}</IconTile>
                <h3 className="mt-5 font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{feature.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <div className="pt-20 sm:pt-24">
        <CtaBanner
          title="Our commitment"
          description="We continuously test and improve with feedback from the disability community. Tell us how we can do better."
          primary={{ href: '/contact', label: 'Give feedback' }}
        />
      </div>
    </>
  );
}
