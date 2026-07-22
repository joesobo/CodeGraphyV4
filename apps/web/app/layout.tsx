import type { Metadata } from 'next';
import { DM_Sans, Fira_Code, Newsreader } from 'next/font/google';
import { Footer } from '@/components/footer';
import { Navbar } from '@/components/nav/navbar';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

// next/font requires literal loader values; the generated theme CSS consumes these variables.
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' });
const newsreader = Newsreader({ subsets: ['latin'], variable: '--font-newsreader' });
const firaCode = Fira_Code({ subsets: ['latin'], variable: '--font-fira-code' });

const title = 'CodeGraphy — Understand the code beneath the surface';
const description =
  'A local-first Relationship Graph for exploring files, symbols, packages, and the relationships between them — in VS Code or from the command line.';

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
    <html
      className={`${dmSans.variable} ${newsreader.variable} ${firaCode.variable}`}
      data-scroll-behavior="smooth"
      lang="en"
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider>
          <div className="min-h-dvh overflow-x-clip">
            <header className="site-header fixed top-0 z-50 w-full">
              <div className="mx-auto w-full max-w-[90rem] px-5 py-3 sm:px-8 lg:px-12">
                <Navbar />
              </div>
            </header>
            <main className="w-full">{children}</main>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
