import { MediaImage } from '@/components/media-image';
import type { ExampleContent } from '@/content/examples';

export function ExampleImage({
  example,
}: {
  example: ExampleContent;
}): React.ReactElement {
  return (
    <div className="relative h-64 w-full shrink-0 border-t border-border bg-[#f5f5f5] sm:h-auto sm:w-[45%] sm:border-l sm:border-t-0 sm:transition-[width] sm:duration-500 sm:ease-in-out sm:group-hover:w-[60%] dark:bg-[#22272e]">
      <MediaImage
        className="absolute inset-0 dark:hidden"
        fill
        imageClassName="object-contain"
        media={{
          alt: `${example.name} example relationship graph in Quiet Light`,
          src: example.screenshots.light,
        }}
        sizes="(min-width: 640px) 560px, 100vw"
      />
      <MediaImage
        className="absolute inset-0 hidden dark:block"
        fill
        imageClassName="object-contain"
        media={{
          alt: `${example.name} example relationship graph in GitHub Dark Dimmed`,
          src: example.screenshots.dark,
        }}
        sizes="(min-width: 640px) 560px, 100vw"
      />
    </div>
  );
}
