import type { Metadata } from 'next';
import { DocList } from './_components/doc-list';
import { DocsHeader } from './_components/docs-header';

export const metadata: Metadata = {
  title: 'Docs',
  description: 'Source-backed CodeGraphy documentation — setup, commands, interactions, settings, and the Plugin API.',
};

export default function DocsPage(): React.ReactElement {
  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-12 px-6 pb-24 sm:px-8 sm:pb-32 lg:px-12">
      <DocsHeader />
      <DocList />
    </div>
  );
}
