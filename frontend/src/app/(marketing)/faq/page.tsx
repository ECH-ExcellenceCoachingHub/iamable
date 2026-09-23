import type { Metadata } from 'next';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/marketing/reveal';
import { PageHero, Section } from '@/components/marketing/sections';
import { FaqList } from './faq-list';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Answers to common questions about Am Able.',
};

const faqs = [
  {
    question: 'How accurate is the sign language translation?',
    answer:
      'Our AI-powered translation achieves 99.2% accuracy on supported signs, making it one of the most reliable sign language translation systems available. Accuracy continues to improve through our self-learning models.',
  },
  {
    question: 'What languages do you support?',
    answer:
      'Speech recognition currently supports Kinyarwanda, English and French. We regularly add new sign and spoken languages based on user demand and community feedback.',
  },
  {
    question: 'How fast is the translation?',
    answer:
      'Our system delivers sub-150ms latency, so translations appear almost instantly. This real-time performance makes natural conversation possible without noticeable delays.',
  },
  {
    question: 'Do I need special equipment?',
    answer:
      'No special equipment is required. Am Able works with any standard webcam or smartphone camera. For best results, use good lighting and keep your hands clearly in view.',
  },
  {
    question: 'Is my data secure and private?',
    answer:
      'Yes. Video is processed on your device and never stored on our servers. Only translations you choose to save are kept in your account, and you can delete them anytime.',
  },
  {
    question: 'Can I use Am Able for business purposes?',
    answer:
      'Absolutely. Our Pro and Enterprise plans are designed for business use and include API access, custom vocabulary, priority support and team management tools.',
  },
  {
    question: 'What happens if a translation is incorrect?',
    answer:
      'You can report incorrect translations directly from the app. This feedback is used to train and improve our models so the system becomes more accurate over time.',
  },
  {
    question: 'Is there a free trial available?',
    answer:
      'Yes. The Free plan includes 100 translations per month, and you can try Pro free for 14 days with no credit card required.',
  },
  {
    question: 'How do I cancel my subscription?',
    answer:
      'You can cancel anytime from your account settings. There are no cancellation fees, and you keep access until the end of your billing period.',
  },
  {
    question: 'Do you offer technical support?',
    answer:
      'Yes. Free plan users have access to community support, while Pro and Enterprise customers receive priority support with faster response times.',
  },
];

export default function FaqPage() {
  return (
    <>
      <PageHero
        eyebrow="Help center"
        eyebrowIcon={<HelpCircle />}
        title={
          <>
            Frequently asked <span className="text-gradient">questions</span>
          </>
        }
        description="Everything you need to know about Am Able. Can't find what you're looking for? Our team is happy to help."
      />

      <Section className="pt-0 sm:pt-0">
        <Reveal className="mx-auto max-w-3xl">
          <FaqList faqs={faqs} />
        </Reveal>
      </Section>

      <Section muted>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Still have questions?</h2>
          <p className="mt-3 text-lg text-muted">Reach out and we&apos;ll get back to you as soon as possible.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button href="/contact" size="lg">
              Contact support
            </Button>
            <Button href="/pricing" variant="outline" size="lg">
              View pricing
            </Button>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
