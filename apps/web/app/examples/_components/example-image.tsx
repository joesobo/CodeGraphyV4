import { MediaImage } from '@/components/media-image';
import type { ExampleContent } from '@/content/examples';

export function ExampleImage({ example }: { example: ExampleContent }): React.ReactElement {
  return (
    <div className="h-72 w-full shrink-0 bg-example-graph-surface p-3">
      <div className="relative h-full overflow-hidden rounded-[1.1rem] bg-example-graph-surface">
        <MediaImage
          className="absolute inset-0"
          fill
          imageClassName="bg-example-graph-surface object-contain"
          media={example.screenshots}
          sizes="(min-width: 1280px) 35vw, 100vw"
        />
      </div>
    </div>
  );
}
