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
    <section className="px-5 py-24 sm:px-8 sm:py-32 lg:px-12">
      <div className="mx-auto max-w-[90rem]">
        <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <SectionHeader
            title="Start at the surface. Go as deep as you need."
            description="The extension is the fastest way in. The CLI and Plugin API are there when your workflow needs more."
          />
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link className={buttonVariants({ size: 'lg' })} href={vscodeExtensionHref} icon="vscode">Install in VS Code</Link>
            <Link className={buttonVariants({ size: 'lg', variant: 'outline' })} href={marketplaceHref}>Marketplace</Link>
          </div>
        </div>

        <ol className="mt-14 grid overflow-hidden rounded-3xl border border-border bg-card/60 lg:grid-cols-3">
          {paths.map((path) => (
            <li className="flex min-h-72 flex-col border-b border-border p-6 last:border-b-0 lg:border-r lg:border-b-0 lg:last:border-r-0 sm:p-8" key={path.number}>
              <p className="font-mono text-xs font-semibold tracking-[0.18em] text-primary">{path.number}</p>
              <h3 className="mt-8 text-3xl font-medium leading-tight">{path.title}</h3>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{path.summary}</p>
              <Link className={cn('mt-auto justify-start px-0 pt-8 text-primary hover:bg-transparent', buttonVariants({ variant: 'ghost' }))} href={path.href} icon={path.icon}>
                {path.label} <span aria-hidden="true">↗</span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
