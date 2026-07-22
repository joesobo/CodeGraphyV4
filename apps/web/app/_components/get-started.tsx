import Image from 'next/image';
import { CopyButton } from '@/components/copy-button';
import { Link } from '@/components/link';
import { SectionHeader } from '@/components/section-header';
import { buttonVariants } from '@/components/ui/button';
import { githubBlobHref, marketplaceHref, pluginsHref, vscodeExtensionHref } from '@/content/links';
import { cn } from '@/lib/utils';

const paths = [
  {
    number: '01',
    title: 'See it in VS Code',
    summary: 'Install the extension, open a CodeGraphy Workspace, run Indexing, and explore the Relationship Graph beside your code.',
    href: vscodeExtensionHref,
    label: 'Install the extension',
    icon: 'vscode' as const,
  },
  {
    number: '02',
    title: 'Query it from the terminal',
    summary: 'Install @codegraphy-dev/core when you want headless Indexing, diagnostics, Graph Query, Graph Scope, and Filter commands.',
    href: `${githubBlobHref}/packages/core/README.md`,
    label: 'Read the CLI guide',
    icon: 'github' as const,
  },
  {
    number: '03',
    title: 'Teach it more',
    summary: 'Enable official Plugins or build a typed Plugin Package to add framework, engine, document, or language-specific graph meaning.',
    href: pluginsHref,
    label: 'Explore Plugins',
    icon: undefined,
  },
] as const;

export function GetStarted(): React.ReactElement {
  return (
    <section className="start-scene px-5 py-20 sm:px-8 sm:py-24 lg:px-12" id="get-started">
      <div className="mx-auto max-w-[90rem]">
        <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <div>
            <p className="section-kicker mb-4 text-primary">Get started</p>
            <SectionHeader
              title="Start at the surface. Go as deep as you need."
              description="The extension is the fastest way in. The CLI and Plugin API are there when your workflow needs more."
            />
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link className={buttonVariants({ size: 'lg' })} href={vscodeExtensionHref} icon="vscode">Install in VS Code</Link>
            <Link className={buttonVariants({ size: 'lg', variant: 'outline' })} href={marketplaceHref}>Marketplace</Link>
          </div>
        </div>

        <ol className="mt-12 grid border-y border-border lg:grid-cols-3">
          {paths.map((path) => (
            <li className="start-path flex min-h-64 flex-col border-b border-border py-8 last:border-b-0 lg:border-r lg:border-b-0 lg:px-8 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0 sm:py-9" key={path.number}>
              <p className="font-heading text-6xl font-medium leading-none text-primary/35">{path.number}</p>
              <h3 className="mt-8 text-3xl font-medium leading-tight">{path.title}</h3>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{path.summary}</p>
              <Link className={cn('mt-auto justify-start px-0 pt-8 text-primary hover:bg-transparent active:scale-100', buttonVariants({ variant: 'ghost' }))} href={path.href} icon={path.icon}>
                {path.label} <span aria-hidden="true">↗</span>
              </Link>
            </li>
          ))}
        </ol>

        <div className="closing-cta relative isolate mt-16 overflow-hidden rounded-[2rem] bg-[#08182b] text-white sm:mt-20" id="install-codegraphy">
          <Image
            alt="Light filtering through deep blue water"
            className="closing-cta-image object-cover"
            fill
            sizes="(min-width: 1536px) 1440px, 100vw"
            src="/media/ocean-closing-cta-v4.jpg"
          />
          <div className="absolute inset-0 bg-[#061427]/72" />
          <div className="relative z-10 grid min-h-96 items-end gap-10 p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:p-14">
            <div className="max-w-3xl">
              <p className="section-kicker text-[#a8c7ff]">Start with your workspace</p>
              <h2 className="mt-5 text-5xl font-medium leading-[0.95] tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
                See the relationships your folder tree cannot show.
              </h2>
            </div>
            <div className="grid gap-4 lg:min-w-80">
              <div className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-white/18 bg-[#07111f]/82 px-4">
                <code className="min-w-0 overflow-x-auto text-xs text-white sm:text-sm">
                  <span className="text-[#ffad98]">$</span> codegraphy index
                </code>
                <CopyButton className="text-white/84 hover:bg-white/10 hover:text-white" text="codegraphy index" />
              </div>
              <Link
                className={cn(buttonVariants({ size: 'lg' }), 'bg-[#ff9d82] text-[#17283b] hover:bg-[#ffb49f]')}
                href={vscodeExtensionHref}
                icon="vscode"
              >
                Install CodeGraphy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
