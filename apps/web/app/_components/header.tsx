import { AccountTree, InstallDesktop } from '@material-symbols-svg/react/rounded';
import { ImageFrame } from '@/components/image-frame';
import { Link } from '@/components/link';
import { MediaImage } from '@/components/media-image';
import { buttonVariants } from '@/components/ui/button';
import { githubHref, vscodeExtensionHref } from '@/content/links';

export function Header(): React.ReactElement {
  return (
    <section className="flex flex-col items-center gap-12 pt-2 text-center sm:gap-16">
      <div className="flex max-w-3xl flex-col items-center">
        <h1 className="text-balance text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
          See how your workspace connects.
        </h1>
        <p className="mt-6 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
          Files, symbols, and the connections between them — indexed once, shared by your editor,
          your agents, and your plugins.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link className={buttonVariants({ size: 'lg' })} href={vscodeExtensionHref}>
            <InstallDesktop aria-hidden="true" />
            Install in VS Code
          </Link>
          <Link className={buttonVariants({ size: 'lg', variant: 'outline' })} href={githubHref}>
            <AccountTree aria-hidden="true" />
            View on GitHub
          </Link>
        </div>
      </div>

      <ImageFrame className="w-full max-w-5xl">
        <MediaImage
          className="w-full"
          imageClassName="h-auto w-full"
          media={{
            alt: 'CodeGraphy relationship graph of a 372-node workspace with colorful file, folder, and symbol nodes',
            src: '/media/header-workspace-graph.png',
          }}
          height={1253}
          width={1359}
        />
      </ImageFrame>
    </section>
  );
}
