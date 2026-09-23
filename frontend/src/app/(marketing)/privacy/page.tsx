import type { Metadata } from 'next';
import { Shield } from 'lucide-react';
import { LegalDocument, type LegalSection } from '@/components/marketing/legal-document';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Am Able collects, uses and protects your personal information.',
};

const sections: LegalSection[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    body: (
      <p>
        At Am Able, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your personal
        information when you use our sign language translation services.
      </p>
    ),
  },
  {
    id: 'information-we-collect',
    title: 'Information we collect',
    body: (
      <>
        <p>We collect the following types of information:</p>
        <ul>
          <li>Account information (name, email, password)</li>
          <li>Usage data (translation history, feature usage)</li>
          <li>Device information (browser type, operating system)</li>
          <li>Payment information (processed securely through third-party providers)</li>
        </ul>
      </>
    ),
  },
  {
    id: 'how-we-use',
    title: 'How we use your information',
    body: (
      <>
        <p>We use your information to:</p>
        <ul>
          <li>Provide and improve our translation services</li>
          <li>Process payments and manage subscriptions</li>
          <li>Send important updates and security notifications</li>
          <li>Analyze usage patterns to enhance user experience</li>
          <li>Train and improve our AI models (using anonymized data only)</li>
        </ul>
      </>
    ),
  },
  {
    id: 'video-data',
    title: 'Video data privacy',
    body: (
      <p>
        Your video is processed in real time for translation purposes. We do not store or transmit your video feed to our
        servers. Hand tracking runs locally in your browser, and only the translations you explicitly choose to save are stored
        in your account.
      </p>
    ),
  },
  {
    id: 'data-security',
    title: 'Data security',
    body: (
      <p>
        We implement industry-standard security measures including encryption, secure authentication, and regular security
        reviews, and we follow GDPR guidelines for data protection.
      </p>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your rights',
    body: (
      <>
        <p>You have the right to:</p>
        <ul>
          <li>Access your personal data</li>
          <li>Correct inaccurate data</li>
          <li>Delete your account and associated data</li>
          <li>Opt out of marketing communications</li>
          <li>Export your data</li>
        </ul>
      </>
    ),
  },
  {
    id: 'contact',
    title: 'Contact us',
    body: (
      <p>
        If you have questions about this Privacy Policy or our data practices, please contact us at{' '}
        <a href="mailto:privacy@amable.com" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
          privacy@amable.com
        </a>
        .
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return <LegalDocument eyebrow="Legal" icon={<Shield />} title="Privacy Policy" updated="January 2024" sections={sections} />;
}
