import { CodeBlock } from '@/components/code-block';
import { Icon } from '@/components/icon';
import { Link } from '@/components/link';
import { MediaImage } from '@/components/media-image';
import { Card, CardContent } from '@/components/ui/card';
import type { PluginContent } from '@/content/plugins';
import { cn } from '@/lib/utils';

export function PluginCard({
  featured,
  plugin,
  version,
}: {
  featured: boolean;
  plugin: PluginContent;
  version?: string | null;
}): React.ReactElement {
  const installCommand = `npm i -g ${plugin.packageName}`;

  return (
    <Card
      as="article"
      className={cn(
        'catalog-card relative overflow-hidden rounded-[1.6rem] bg-card',
        featured && 'xl:col-span-2',
      )}
      id={plugin.id}
    >
      <CardContent
        className={cn(
          'flex h-full flex-col p-6 sm:p-7',
          featured && 'xl:grid xl:grid-cols-[.86fr_1.14fr] xl:gap-8',
        )}
      >
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary">
              <Icon className="size-7" src={plugin.iconUrl} />
            </span>
            <div className="min-w-0">
              <h3 className="text-2xl font-medium">{plugin.name}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <Link className="text-primary" href={plugin.npmHref} variant="text">
                  {plugin.packageName}
                </Link>
                {version ? (
                  <span className="font-mono text-[0.7rem] text-muted-foreground">v{version}</span>
                ) : null}
                <Link
                  className="inline-flex items-center gap-1 text-sm font-semibold text-foreground transition-colors hover:text-primary"
                  href={plugin.sourceHref}
                  icon="github"
                >
                  Source
                </Link>
              </div>
            </div>
          </div>
          <p className="mt-5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
            {plugin.pluginId}
          </p>
          <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">{plugin.summary}</p>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            <span className="font-semibold text-foreground">Supports:</span>{' '}
            {plugin.supported.join(' · ')}
          </p>
          <CodeBlock className="mt-5 text-xs">{installCommand}</CodeBlock>
        </div>
        {plugin.media ? (
          <MediaImage
            className="mt-5 h-64 rounded-2xl border border-border bg-secondary xl:mt-0 xl:h-full xl:min-h-72"
            fill
            imageClassName="object-contain object-center"
            media={plugin.media}
            sizes="(min-width: 1280px) 40vw, 100vw"
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
