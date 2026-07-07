import { PageSidebar } from '@/components/nav/page-sidebar';
import { SectionHeader } from '@/components/section-header';
import { exampleContent, type ExampleContent } from '@/content/examples';
import { exampleNavGroups } from '@/content/navigation';
import { ExampleCard } from './example-card';

export function ExampleList(): React.ReactElement {
  return (
    <section className="grid gap-10" id="example-workspaces">
      <SectionHeader
        title="Example workspaces"
        description="Open the repo-root examples folder to compare languages side by side, or open one focused example when you want a clean demo."
      />

      <div className="lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-6">
        <PageSidebar nav={exampleNavGroups} />
        <div className="grid gap-10">
          <ExampleGroup
            title="Language examples"
            description="Core reads these out of the box — each card opens a runnable workspace showing the imports, symbols, and inheritance CodeGraphy indexes for that language."
            examples={exampleContent.filter((example) => example.category === 'language')}
            id="language-examples"
          />

          <ExampleGroup
            title="Plugin package examples"
            description="Workspaces that need a package-backed CodeGraphy plugin for framework, engine, document, or visual graph behavior."
            examples={exampleContent.filter((example) => example.category === 'plugin')}
            id="plugin-examples"
          />
        </div>
      </div>
    </section>
  );
}

function ExampleGroup({
  title,
  description,
  examples,
  id,
}: {
  title: string;
  description: string;
  examples: readonly ExampleContent[];
  id: string;
}): React.ReactElement {
  return (
    <section className="grid gap-4" id={id}>
      <div>
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-4">
        {examples.map((example) => (
          <ExampleCard example={example} key={example.id} />
        ))}
      </div>
    </section>
  );
}
