import { Icon } from '@/components/icon';
import { Link } from '@/components/link';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import type { ExampleContent } from '@/content/examples';
import { githubTreeHref } from '@/content/links';
import { pluginContent } from '@/content/plugins';
import { ExampleImage } from './example-image';

const pluginHrefById = new Map<string, string>(
  pluginContent.map((plugin) => [plugin.id, plugin.href]),
);

export function ExampleCard({ example }: { example: ExampleContent }): React.ReactElement {
  const pluginHref = example.plugin ? pluginHrefById.get(example.plugin.id) : undefined;

  return (
    <Card
      as="article"
      className="catalog-card grid overflow-hidden rounded-[1.6rem] bg-card"
      id={example.id}
    >
      <ExampleImage example={example} />
      <CardContent className="flex flex-col p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-secondary">
            <Icon className="size-6 shrink-0" src={example.iconUrl} />
          </span>
          <div>
            <CardTitle className="text-2xl font-medium">{example.name}</CardTitle>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{example.summary}</p>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          <span className="font-semibold text-foreground">Includes:</span>{' '}
          {example.supported.join(' · ')}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {pluginHref ? (
            <Link href={pluginHref} variant="text">
              {example.name} Plugin
            </Link>
          ) : null}
          <Link href={`${githubTreeHref}/${example.workspace}`} icon="github" variant="text">
            Open workspace
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
