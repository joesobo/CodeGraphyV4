import { Link } from '@/components/link';
import {
  changelogHref,
  docsHref,
  examplesHref,
  githubHref,
  homeHref,
  marketplaceHref,
  pluginsHref,
  vscodeExtensionHref,
} from '@/content/links';

interface FooterColumn {
  links: readonly { href: string; label: string }[];
  title: string;
}

const footerColumns = [
  {
    title: 'Explore',
    links: [
      { href: docsHref, label: 'Docs' },
      { href: pluginsHref, label: 'Plugins' },
      { href: examplesHref, label: 'Examples' },
    ],
  },
  {
    title: 'Project',
    links: [
      { href: githubHref, label: 'GitHub' },
      { href: changelogHref, label: 'Changelog' },
      { href: vscodeExtensionHref, label: 'Install in VS Code' },
      { href: marketplaceHref, label: 'Marketplace' },
    ],
  },
] satisfies readonly FooterColumn[];

export function Footer(): React.ReactElement {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-border pt-12">
      <div className="flex flex-col gap-12 lg:flex-row lg:justify-between">
        <div className="max-w-xs">
          <Link
            aria-label="CodeGraphy home"
            className="inline-flex items-center gap-2 text-base font-semibold"
            href={homeHref}
          >
            <span aria-hidden="true" className="codegraphy-symbol text-[1.75rem]" />
            CodeGraphy
          </Link>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            An interactive Relationship Graph for your codebase, inside VS Code.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-10 sm:gap-16">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <p className="text-sm font-semibold text-foreground">{column.title}</p>
              <ul className="mt-4 grid gap-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      href={link.href}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12 flex flex-col gap-2 border-t border-border py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© {year} Joe Soboleski</p>
        <p className="font-mono uppercase tracking-widest">MIT licensed</p>
      </div>
    </footer>
  );
}
