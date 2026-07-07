import type { Metadata } from 'next';
import { Fira_Code, Geist } from 'next/font/google';
import { Footer } from '@/components/footer';
import { Navbar } from '@/components/nav/navbar';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

// next/font requires literal loader values; the generated theme CSS consumes these variables.
const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });
const firaCode = Fira_Code({ subsets: ['latin'], variable: '--font-fira-code' });

const title = 'CodeGraphy — See how your workspace connects';
const description =
  'An interactive Relationship Graph for your workspace. Files, symbols, and the connections between them — for people and agents.';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://codegraphy.dev'),
  title: {
    default: title,
    template: '%s · CodeGraphy',
  },
  description,
  openGraph: {
    description,
    siteName: 'CodeGraphy',
    title,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    description,
    title,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html className={`${geist.variable} ${firaCode.variable}`} lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <div className="min-h-screen">
            <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
              <div className="mx-auto w-full max-w-7xl px-6 py-3 sm:px-8 lg:px-12">
                <Navbar />
              </div>
            </header>
            <div className="mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-12">
              <main className="w-full py-10 sm:py-14">{children}</main>
              <Footer />
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
