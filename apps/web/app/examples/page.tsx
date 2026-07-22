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
    <div className="w-full min-w-0">
      <ExamplesHeader />
      <div className="mx-auto w-full max-w-[90rem] px-5 py-24 sm:px-8 sm:py-32 lg:px-12"><ExampleList /></div>
    </div>
  );
}
