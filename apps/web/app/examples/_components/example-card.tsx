import { Icon } from '@/components/icon';
import { Link } from '@/components/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import type { ExampleContent } from '@/content/examples';
import { githubTreeHref } from '@/content/links';
import { pluginContent } from '@/content/plugins';
import { ExampleImage } from './example-image';

const pluginHrefById = new Map<string, string>(
  pluginContent.map((plugin) => [plugin.id, plugin.href]),
);

export function ExampleCard({
  example,
}: {
  example: ExampleContent;
}): React.ReactElement {
  const pluginHref = example.plugin ? pluginHrefById.get(example.plugin.id) : undefined;

  return (
    <Card as="article" className="overflow-hidden" id={example.id} interactive>
      <div className="flex flex-col sm:min-h-72 sm:flex-row">
        <CardContent className="flex flex-1 flex-col p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Icon className="size-7 shrink-0" src={example.iconUrl} />
            <CardTitle className="text-lg">{example.name}</CardTitle>
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
          <div className="mt-auto flex flex-wrap items-center gap-4 pt-4">
            {pluginHref ? (
              <Link href={pluginHref} variant="text">
                {example.name} Plugin
              </Link>
            ) : null}
            <Link href={`${githubTreeHref}/${example.workspace}`} icon="github" variant="text">
              Example
            </Link>
          </div>
        </CardContent>
        <ExampleImage example={example} />
      </div>
    </Card>
  );
}
