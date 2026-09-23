import type { Metadata } from 'next';
import { FileText } from 'lucide-react';
import { LegalDocument, type LegalSection } from '@/components/marketing/legal-document';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms that govern your use of Am Able.',
};

const sections: LegalSection[] = [
  {
    id: 'acceptance',
    title: 'Acceptance of terms',
    body: (
      <p>
        By accessing or using Am Able&apos;s services, you agree to be bound by these Terms of Service. If you do not agree to
        these terms, please do not use our services.
      </p>
    ),
  },
  {
    id: 'service',
    title: 'Description of service',
    body: (
      <p>
        Am Able provides AI-powered sign language translation services including sign-to-text, text-to-sign, and voice-to-sign
        translation. Our services are designed to facilitate communication between deaf, hard-of-hearing, and hearing
        individuals.
      </p>
    ),
  },
  {
    id: 'responsibilities',
    title: 'User responsibilities',
    body: (
      <>
        <p>As a user of Am Able, you agree to:</p>
        <ul>
          <li>Use the service for lawful purposes only</li>
          <li>Not attempt to reverse engineer or circumvent security measures</li>
          <li>Not use the service to harass, abuse, or harm others</li>
          <li>Provide accurate information when creating an account</li>
          <li>Maintain the security of your account credentials</li>
          <li>Comply with all applicable laws and regulations</li>
        </ul>
      </>
    ),
  },
  {
    id: 'ip',
    title: 'Intellectual property',
    body: (
      <p>
        All content, features, and functionality of the Am Able platform are owned by Am Able and are protected by international
        copyright, trademark, and other intellectual property laws. You may not reproduce, modify, or distribute our content
        without prior written consent.
      </p>
    ),
  },
  {
    id: 'payment',
    title: 'Payment terms',
    body: (
      <>
        <p>Paid subscriptions are billed on a monthly or annual basis:</p>
        <ul>
          <li>Fees are non-refundable except as required by law</li>
          <li>You may cancel your subscription at any time</li>
          <li>Cancellation takes effect at the end of the current billing period</li>
          <li>We reserve the right to modify pricing with 30 days notice</li>
        </ul>
      </>
    ),
  },
  {
    id: 'warranties',
    title: 'Disclaimer of warranties',
    body: (
      <p>
        Am Able provides services on an &quot;as is&quot; basis without warranties of any kind, whether express or implied. We do
        not guarantee that the service will be uninterrupted, error-free, or that translations will be 100% accurate.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    body: (
      <p>
        To the maximum extent permitted by law, Am Able shall not be liable for any indirect, incidental, special, or
        consequential damages arising from the use or inability to use our services.
      </p>
    ),
  },
  {
    id: 'termination',
    title: 'Termination',
    body: (
      <p>
        We reserve the right to suspend or terminate your account at any time for violation of these terms. Upon termination,
        your right to use the service will immediately cease.
      </p>
    ),
  },
  {
    id: 'law',
    title: 'Governing law',
    body: (
      <p>
        These Terms of Service shall be governed by and construed in accordance with the laws of the jurisdiction in which Am
        Able is headquartered, without regard to its conflict of law provisions.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to terms',
    body: (
      <p>
        We reserve the right to modify these terms at any time. Continued use of the service after modifications constitutes
        acceptance of the updated terms.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact information',
    body: (
      <p>
        For questions about these Terms of Service, please contact us at{' '}
        <a href="mailto:legal@amable.com" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
          legal@amable.com
        </a>
        .
      </p>
    ),
  },
];

export default function TermsPage() {
  return <LegalDocument eyebrow="Legal" icon={<FileText />} title="Terms of Service" updated="January 2024" sections={sections} />;
}
