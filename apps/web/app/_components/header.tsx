import Image from 'next/image';
import { Link } from '@/components/link';
import { buttonVariants } from '@/components/ui/button';
import { examplesHref, githubHref, vscodeExtensionHref } from '@/content/links';
import { cn } from '@/lib/utils';

export function Header(): React.ReactElement {
  return (
    <section className="relative isolate min-h-[calc(100svh-4.05rem)] overflow-hidden bg-[#061722] text-white">
      <Image
        alt="A school of silver fish moving through deep blue water like an organic relationship network"
        className="object-cover object-[68%_center] sm:object-center"
        fill
        priority
        sizes="100vw"
        src="/media/ocean-relationship-hero.jpg"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,18,29,.92)_0%,rgba(3,18,29,.72)_42%,rgba(3,18,29,.18)_78%,rgba(3,18,29,.3)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(3,18,29,.86)_0%,transparent_42%,rgba(3,18,29,.2)_100%)]" />
      <div aria-hidden="true" className="ocean-grid absolute inset-0 opacity-25" />

      <div className="relative mx-auto flex min-h-[calc(100svh-4.05rem)] w-full max-w-[90rem] items-center px-5 py-20 sm:px-8 sm:py-24 lg:px-12">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-medium text-white/78 backdrop-blur-md">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-[#61d8ca] shadow-[0_0_12px_#61d8ca]" />
            Local-first · Open source · Inside VS Code
          </div>
          <h1 className="mt-8 max-w-4xl text-balance text-[clamp(3.6rem,8.7vw,8.4rem)] font-medium leading-[0.83] tracking-[-0.055em]">
            Understand the code <em className="font-normal text-[#8be4d9]">beneath</em> the surface.
          </h1>
          <p className="mt-8 max-w-2xl text-pretty text-base leading-7 text-white/68 sm:text-xl sm:leading-8">
            CodeGraphy turns files, symbols, packages, and their relationships into one interactive
            Relationship Graph—so you can see how a CodeGraphy Workspace actually fits together.
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

        <Link
          className="absolute right-5 bottom-7 hidden items-center gap-3 rounded-full border border-white/15 bg-black/15 px-4 py-3 text-xs font-medium text-white/68 backdrop-blur-md transition-colors hover:bg-black/30 hover:text-white sm:flex lg:right-12"
          href={examplesHref}
        >
          <span className="font-mono text-[#61d8ca]">24</span>
          runnable language workspaces
          <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </section>
  );
}
