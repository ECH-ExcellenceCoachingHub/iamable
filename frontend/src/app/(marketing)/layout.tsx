import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { AccessibilityToolbar } from '@/components/accessibility/accessibility-toolbar';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
      <AccessibilityToolbar />
    </div>
  );
}
