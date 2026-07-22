import Image from 'next/image';
import { CopyButton } from '@/components/copy-button';
import { Link } from '@/components/link';
import { buttonVariants } from '@/components/ui/button';
import { examplesHref, githubHref, vscodeExtensionHref } from '@/content/links';
import { cn } from '@/lib/utils';
import { HeroGraph } from './hero-graph';

export function Header(): React.ReactElement {
  return (
    <section className="home-hero relative isolate overflow-hidden bg-[#061722] text-white">
      <Image
        alt="Sunlight filtering through the surface of deep blue water"
        className="hero-image object-cover object-center"
        fill
        priority
        sizes="100vw"
        src="/media/ocean-home-surface-v4.jpg"
      />
      <div className="home-hero-grade absolute inset-0" />
      <HeroGraph />

      <div className="relative z-10 mx-auto grid min-h-[44rem] w-full max-w-[90rem] items-end gap-10 px-5 pt-32 pb-10 sm:min-h-[46rem] sm:px-8 sm:pb-14 lg:min-h-svh lg:grid-cols-[minmax(0,1.2fr)_minmax(22rem,.62fr)] lg:gap-16 lg:px-12 lg:pb-16">
        <div className="hero-copy max-w-5xl">
          <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#bad2ff]">
            Local-first relationship graph
          </p>
          <h1 className="mt-5 max-w-5xl text-balance text-[clamp(3.65rem,7vw,7.6rem)] font-medium leading-[0.88] tracking-[-0.055em]">
            Understand the code <em className="font-normal text-[#ffb49f]">beneath</em> the surface.
          </h1>
        </div>

        <div className="hero-aside max-w-xl lg:justify-self-end">
          <p className="max-w-[36rem] text-pretty text-base leading-7 text-white/94 sm:text-lg sm:leading-8">
            CodeGraphy turns files, symbols, packages, and their relationships into one interactive
            Relationship Graph, so you can see how a workspace actually fits together.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              className={cn(buttonVariants({ size: 'lg' }), 'bg-[#ff9d82] text-[#17283b] hover:bg-[#ffb49f]')}
              href={vscodeExtensionHref}
              icon="vscode"
            >
              Install in VS Code
            </Link>
            <Link
              className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'border-white/22 bg-white/6 text-white hover:border-white/40 hover:bg-white/12')}
              href={githubHref}
              icon="github"
            >
              Explore the source
            </Link>
          </div>
          <div className="hero-console mt-8" aria-label="CodeGraphy command preview">
            <code><span>$</span> codegraphy index</code>
            <div className="hero-console-actions">
              <CopyButton className="text-white/80 hover:bg-white/8 hover:text-white" text="codegraphy index" />
              <Link href={examplesHref}>View examples <span aria-hidden="true">↗</span></Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
