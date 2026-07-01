import type { Metadata } from 'next';
import { SiteNavigation } from '@/components/site/navigation';
import './globals.css';

export const metadata: Metadata = {
  title: 'CodeGraphy',
  description: 'A visual Relationship Graph for understanding how your workspace connects.',
};

const rootLayoutClassNames = {
  shell: 'min-h-screen px-6 py-5',
  header: 'mx-auto w-full max-w-6xl',
} as const;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="en">
      <body>
        <div className={rootLayoutClassNames.shell}>
          <header className={rootLayoutClassNames.header}>
            <SiteNavigation />
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
