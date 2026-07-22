import { MediaImage } from '@/components/media-image';
import type { ExampleContent } from '@/content/examples';

export function ExampleImage({ example }: { example: ExampleContent }): React.ReactElement {
  const caption = `${example.name} Relationship Graph from ${example.workspace}.`;

  return (
    <figure className="flex h-80 w-full shrink-0 flex-col bg-example-graph-surface">
      <div className="relative m-6 min-h-0 flex-1 overflow-hidden rounded-xl bg-example-graph-surface sm:m-7">
        <MediaImage
          className="absolute inset-0"
          fill
          imageClassName="bg-example-graph-surface object-contain"
          media={example.screenshots}
          sizes="(min-width: 1280px) 35vw, 100vw"
        />
      </div>
      <figcaption className="px-5 pb-4 text-xs leading-5 text-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  );
}
