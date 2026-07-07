import type { Metadata } from 'next';
import { ExampleList } from './_components/example-list';
import { ExamplesHeader } from './_components/examples-header';

export const metadata: Metadata = {
  title: 'Examples',
  description:
    'Runnable example workspaces showing exactly what CodeGraphy reads in each language and plugin.',
};

export default function ExamplesPage(): React.ReactElement {
  return (
    <div className="min-w-0 space-y-12">
      <ExamplesHeader />
      <ExampleList />
    </div>
  );
}
