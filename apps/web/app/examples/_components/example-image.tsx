import { MediaImage } from '@/components/media-image';
import type { ExampleContent } from '@/content/examples';
import { cn } from '@/lib/utils';

export function ExampleImage({
  example,
  featured,
}: {
  example: ExampleContent;
  featured: boolean;
}): React.ReactElement {
  const caption = `${example.name} Relationship Graph from ${example.workspace}.`;

  return (
    <figure
      className={cn(
        'flex h-64 w-full shrink-0 flex-col border-b border-border bg-example-graph-surface',
        featured && 'sm:h-80 xl:h-full xl:min-h-[30rem] xl:border-r xl:border-b-0',
      )}
    >
      <div className="relative min-h-0 flex-1">
        <MediaImage
          className="absolute inset-0"
          fill
          imageClassName="bg-example-graph-surface object-contain"
          media={example.screenshots}
          sizes={featured ? '(min-width: 1280px) 50vw, 100vw' : '(min-width: 1280px) 35vw, 100vw'}
        />
      </div>
      <figcaption className="border-t border-border bg-card/80 px-4 py-2 text-xs leading-5 text-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  );
}
