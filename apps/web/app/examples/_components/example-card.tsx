import { Icon } from '@/components/icon';
import { Link } from '@/components/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import type { ExampleContent } from '@/content/examples';
import { githubTreeHref } from '@/content/links';
import { pluginContent } from '@/content/plugins';
import { cn } from '@/lib/utils';
import { ExampleImage } from './example-image';

const pluginHrefById = new Map<string, string>(
  pluginContent.map((plugin) => [plugin.id, plugin.href]),
);

export function ExampleCard({
  example,
  featured,
}: {
  example: ExampleContent;
  featured: boolean;
}): React.ReactElement {
  const pluginHref = example.plugin ? pluginHrefById.get(example.plugin.id) : undefined;

  return (
    <Card
      as="article"
      className={cn(
        'catalog-card group grid overflow-hidden rounded-[1.6rem] bg-card/70 transition-[border-color,background-color] duration-200 hover:border-primary/35 hover:bg-card',
        featured && 'xl:col-span-2 xl:grid-cols-[1.08fr_.92fr]',
      )}
      id={example.id}
    >
      <ExampleImage example={example} featured={featured} />
      <CardContent className="flex min-h-64 flex-col p-6 sm:p-7">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-secondary">
            <Icon className="size-6 shrink-0" src={example.iconUrl} />
          </span>
          <div>
            <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-primary">
              Runnable workspace
            </p>
            <CardTitle className="mt-1 text-2xl font-medium">{example.name}</CardTitle>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{example.summary}</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {example.supported.map((tag) => (
            <li key={tag}>
              <Badge className="font-mono text-[0.7rem] font-medium" variant="secondary">
                {tag}
              </Badge>
            </li>
          ))}
        </ul>
        <div className="mt-auto flex flex-wrap items-center gap-4 border-t border-border pt-4">
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
