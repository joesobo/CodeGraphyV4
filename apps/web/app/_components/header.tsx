import { Link } from '@/components/link';
import { MediaImage } from '@/components/media-image';
import { buttonVariants } from '@/components/ui/button';
import { githubHref, vscodeExtensionHref } from '@/content/links';

export function Header(): React.ReactElement {
  return (
    <section className="flex flex-col items-center gap-12 pt-2 text-center sm:gap-16">
      <div className="mx-auto flex w-full max-w-7xl justify-center px-6 sm:px-8 lg:px-12">
        <div className="flex max-w-3xl flex-col items-center">
          <h1 className="text-balance text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
            See how your workspace <span className="text-primary">connects.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
            CodeGraphy indexes your files, symbols, and Relationships into one local Relationship
            Graph — explored in VS Code, queried by agents, extended by Plugins.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link className={buttonVariants({ size: 'lg' })} href={vscodeExtensionHref} icon="vscode">
              Install in VS Code
            </Link>
            <Link className={buttonVariants({ size: 'lg', variant: 'outline' })} href={githubHref} icon="github">
              View on GitHub
            </Link>
          </div>
        </div>
      </div>

      <div className="w-full bg-graph-surface">
        <MediaImage
          className="mx-auto flex w-full justify-center sm:h-96 md:h-[30rem] lg:h-[36rem] xl:h-[42rem]"
          imageClassName="block h-auto w-full sm:h-full sm:w-auto"
          media={{
            alt: 'CodeGraphy Relationship Graph with colorful file, folder, and symbol nodes',
            src: '/media/header-workspace-graph-light.png',
            darkSrc: '/media/header-workspace-graph-dark.png',
          }}
          height={1200}
          width={1200}
        />
      </div>
    </section>
  );
}
