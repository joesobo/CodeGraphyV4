import type { Metadata } from 'next';
import { DM_Sans, Fira_Code, Newsreader } from 'next/font/google';
import { Footer } from '@/components/footer';
import { Navbar } from '@/components/nav/navbar';
import { ThemeProvider } from '@/components/theme-provider';
import { siteDescription, siteName, siteUrl } from '@/content/site';
import './globals.css';

// next/font requires literal loader values; the generated theme CSS consumes these variables.
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' });
const newsreader = Newsreader({
  axes: ['opsz'],
  display: 'swap',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-newsreader',
});
const firaCode = Fira_Code({ subsets: ['latin'], variable: '--font-fira-code' });

const title = 'CodeGraphy | Understand the code beneath the surface';

export const metadata: Metadata = {
  metadataBase: siteUrl,
  applicationName: siteName,
  title: {
    default: title,
    template: '%s · CodeGraphy',
  },
  description: siteDescription,
  alternates: {
    canonical: '/',
  },
  category: 'developer tools',
  creator: 'Joe Soboleski',
  openGraph: {
    description: siteDescription,
    locale: 'en_US',
    siteName,
    title,
    type: 'website',
    url: '/',
  },
  publisher: 'Joe Soboleski',
  robots: {
    follow: true,
    index: true,
  },
  twitter: {
    card: 'summary_large_image',
    description: siteDescription,
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
            <a className="skip-link" href="#main-content">Skip to content</a>
            <header className="site-header fixed top-0 z-50 w-full">
              <div className="mx-auto w-full max-w-[90rem] px-5 py-3 sm:px-8 lg:px-12">
                <Navbar />
              </div>
            </header>
            <main className="w-full" id="main-content">{children}</main>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
