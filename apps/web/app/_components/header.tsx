import Image from 'next/image';
import { Link } from '@/components/link';
import { buttonVariants } from '@/components/ui/button';
import { examplesHref, githubHref, vscodeExtensionHref } from '@/content/links';
import { cn } from '@/lib/utils';

export function Header(): React.ReactElement {
  return (
    <section className="home-hero relative isolate min-h-svh overflow-hidden bg-[#061722] text-white">
      <Image
        alt="A school of fish moving together through deep ocean water"
        className="hero-image object-cover object-[58%_center]"
        fill
        priority
        sizes="100vw"
        src="/media/ocean-relationship-hero.jpg"
      />
      <div className="home-hero-grade absolute inset-0" />
      <div aria-hidden="true" className="ocean-current absolute inset-0">
        <span />
        <span />
        <span />
      </div>

      <div className="relative mx-auto flex min-h-svh w-full max-w-[90rem] flex-col items-center justify-center px-5 pt-28 pb-32 text-center sm:px-8 lg:px-12">
        <div className="hero-copy flex max-w-5xl flex-col items-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-medium text-white/78 backdrop-blur-md">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-[#61d8ca] shadow-[0_0_12px_#61d8ca]" />
            Local-first · Open source · Inside VS Code
          </div>
          <h1 className="mt-8 max-w-5xl text-balance text-[clamp(3.75rem,7.5vw,8rem)] font-medium leading-[0.86] tracking-[-0.055em]">
            Understand the code <em className="font-normal text-[#8be4d9]">beneath</em> the surface.
          </h1>
          <p className="mt-8 max-w-[42rem] text-pretty text-base leading-7 text-white/72 sm:text-lg sm:leading-8">
            CodeGraphy turns files, symbols, packages, and their relationships into one interactive
            Relationship Graph, so you can see how a workspace actually fits together.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              className={cn(buttonVariants({ size: 'lg' }), 'bg-[#61d8ca] text-[#05252a] hover:bg-[#91ebe1]')}
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
        </div>

        <div className="hero-console" aria-label="CodeGraphy workflow preview">
          <div className="hero-console-steps" aria-hidden="true">
            <span className="is-active">01 Index</span>
            <span>02 Inspect</span>
            <span>03 Query</span>
          </div>
          <div className="hero-console-line">
            <code><span>$</span> codegraphy index</code>
            <Link href={examplesHref}><strong>24</strong> runnable workspaces <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
