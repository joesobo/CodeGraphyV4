import type { Metadata } from 'next';
import { DocList } from './_components/doc-list';
import { DocsHeader } from './_components/docs-header';

const description = 'Source-backed CodeGraphy documentation for the VS Code extension, Core CLI, interactions, settings, Plugins, and the Plugin API.';

export const metadata: Metadata = {
  title: 'Docs',
  description,
  alternates: { canonical: '/docs' },
  openGraph: { description, title: 'Docs · CodeGraphy', url: '/docs' },
  twitter: { card: 'summary_large_image', description, title: 'Docs · CodeGraphy' },
};

export default function DocsPage(): React.ReactElement {
  return (
    <div className="route-surface w-full min-w-0">
      <DocsHeader />
      <div className="mx-auto w-full max-w-[90rem] px-5 py-16 sm:px-8 sm:py-20 lg:px-12" id="page-content"><DocList /></div>
    </div>
  );
}
