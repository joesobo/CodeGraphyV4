import type { Metadata } from 'next';
import { ExampleList } from './_components/example-list';
import { ExamplesHeader } from './_components/examples-header';

export const metadata: Metadata = {
  title: 'Examples',
  description:
    'Runnable example CodeGraphy Workspaces showing exactly what CodeGraphy reads in each language and Plugin.',
};

export default function ExamplesPage(): React.ReactElement {
  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-12 px-6 pb-24 sm:px-8 sm:pb-32 lg:px-12">
      <ExamplesHeader />
      <ExampleList />
    </div>
  );
}
