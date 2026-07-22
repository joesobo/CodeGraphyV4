import { Agents } from './_components/agents';
import { GetStarted } from './_components/get-started';
import { Header } from './_components/header';
import { ProductDive } from './_components/product-dive';
import { SupportedLanguages } from './_components/supported-languages';
import { siteDescription, siteName, siteOrigin } from '@/content/site';

const websiteStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  creator: {
    '@type': 'Person',
    name: 'Joe Soboleski',
    url: 'https://github.com/joesobo',
  },
  description: siteDescription,
  inLanguage: 'en-US',
  name: siteName,
  url: siteOrigin,
} as const;

export default function HomePage(): React.ReactElement {
  return (
    <div className="flex min-w-0 flex-col [&>*]:min-w-0">
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteStructuredData).replace(/</g, '\\u003c'),
        }}
        type="application/ld+json"
      />
      <Header />
      <ProductDive />
      <Agents />
      <div className="py-10 sm:py-12"><SupportedLanguages /></div>
      <GetStarted />
    </div>
  );
}
