import type { Metadata } from 'next';
import { DocList } from './_components/doc-list';
import { DocsHeader } from './_components/docs-header';

export const metadata: Metadata = {
  title: 'Docs',
  description: 'Source-backed CodeGraphy documentation — setup, commands, interactions, settings, and the Plugin API.',
};

export default function DocsPage(): React.ReactElement {
  return (
    <div className="min-w-0 space-y-12">
      <DocsHeader />
      <DocList />
    </div>
  );
}
