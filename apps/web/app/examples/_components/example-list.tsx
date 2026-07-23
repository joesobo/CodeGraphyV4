import { PageSidebar } from '@/components/nav/page-sidebar';
import { SectionHeader } from '@/components/section-header';
import { exampleContent, type ExampleContent } from '@/content/examples';
import { exampleNavGroups } from '@/content/navigation';
import { ExampleCard } from './example-card';

export function ExampleList(): React.ReactElement {
  return (
    <section className="grid gap-14" id="example-workspaces">
      <SectionHeader
        title="Small workspaces. Honest graphs."
        description="Compare the runnable examples side by side, or open one focused workspace when you want a clean demonstration of a language or Plugin."
      />

      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-10">
        <PageSidebar nav={exampleNavGroups} />
        <div className="grid min-w-0 gap-14">
          <ExampleGroup
            title="Language examples"
            description="The Core Package reads these languages out of the box. Each card opens a runnable CodeGraphy Workspace with real imports, symbols, and inheritance."
            examples={exampleContent.filter((example) => example.category === 'language')}
            id="language-examples"
          />

          <ExampleGroup
            title="Plugin package examples"
            description="CodeGraphy Workspaces that need a package-backed Plugin for framework, engine, document, or visual Relationship Graph behavior."
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
        <h3 className="text-3xl font-medium">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className="grid auto-rows-fr items-stretch gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {examples.map((example) => (
          <ExampleCard example={example} key={example.id} />
        ))}
      </div>
    </section>
  );
}
