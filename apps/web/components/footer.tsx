import { Link, type LinkIcon } from '@/components/link';
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

const footerColumns: readonly {
  links: readonly { href: string; label: string; icon?: LinkIcon }[];
  title: string;
}[] = [
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
      { href: changelogHref, label: 'Changelog' },
      { href: marketplaceHref, label: 'Marketplace' },
      { href: githubHref, icon: 'github', label: 'GitHub' },
      { href: vscodeExtensionHref, icon: 'vscode', label: 'VS Code' },
    ],
  },
];

export function Footer(): React.ReactElement {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-border bg-background px-6 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl pt-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
          <div className="max-w-xs">
            <Link
              aria-label="CodeGraphy home"
              className="inline-flex items-center gap-2 text-sm font-semibold"
              href={homeHref}
            >
              <span aria-hidden="true" className="codegraphy-symbol text-[1.4rem]" />
              CodeGraphy
            </Link>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              An interactive Relationship Graph for your codebase, inside VS Code.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:gap-12">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <p className="text-xs font-semibold text-foreground">{column.title}</p>
                <ul className="mt-2 grid gap-1.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        className="inline-flex items-center gap-2 text-sm leading-5 text-muted-foreground transition-colors hover:text-foreground"
                        href={link.href}
                        icon={link.icon}
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

        <div className="mt-6 flex flex-col gap-2 border-t border-border py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Joe Soboleski</p>
          <p className="font-mono uppercase tracking-widest">MIT licensed</p>
        </div>
      </div>
    </footer>
  );
}
