import { CodeBlock } from '@/components/code-block';
import { Icon } from '@/components/icon';
import { Link } from '@/components/link';
import { MediaImage } from '@/components/media-image';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { PluginContent } from '@/content/plugins';

export function PluginCard({
  plugin,
  version,
}: {
  plugin: PluginContent;
  version?: string | null;
}): React.ReactElement {
  const installCommand = `npm i -g ${plugin.packageName}`;

  return (
    <Card as="article" id={plugin.id} interactive>
      <CardContent className="flex h-full flex-col p-5">
        <div className="flex items-center gap-3">
          <Icon className="size-8 shrink-0" src={plugin.iconUrl} />
          <div className="min-w-0">
            <h3 className="text-lg font-semibold">
              <Link className="transition-colors hover:text-primary" href={plugin.sourceHref}>
                {plugin.name}
              </Link>
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <Link className="text-primary" href={plugin.npmHref} variant="text">
                {plugin.packageName}
              </Link>
              {version ? (
                <Badge className="font-mono text-[0.7rem]" variant="secondary">
                  v{version}
                </Badge>
              ) : null}
              <Link
                className="inline-flex items-center gap-1 text-sm font-semibold text-foreground transition-colors hover:text-primary"
                href={plugin.sourceHref}
              >
                <Icon className="size-3.5" src="/icons/github.svg" variant="mono" />
                Source
              </Link>
            </div>
          </div>
        </div>
        <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">{plugin.summary}</p>
        {plugin.media ? (
          <MediaImage
            className="mt-4 h-44 rounded-lg border border-border bg-secondary transition-[height] duration-500 ease-in-out hover:h-64"
            fill
            imageClassName="object-cover object-top"
            media={plugin.media}
            sizes="(min-width: 1280px) 40vw, 100vw"
          />
        ) : null}
        <CodeBlock className="mt-4 text-xs">{installCommand}</CodeBlock>
      </CardContent>
    </Card>
  );
}
