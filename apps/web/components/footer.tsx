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
    <footer className="w-full overflow-hidden bg-[#06131d] px-6 text-[#edf7f5] sm:px-8 lg:px-12">
      <div className="relative mx-auto max-w-[90rem] py-16 sm:py-20">
        <div aria-hidden="true" className="ocean-grid pointer-events-none absolute inset-0 opacity-35" />
        <div className="relative flex flex-col gap-12 lg:flex-row lg:justify-between">
          <div className="max-w-md">
            <Link
              aria-label="CodeGraphy home"
              className="inline-flex items-center gap-3 text-lg font-semibold"
              href={homeHref}
            >
              <span aria-hidden="true" className="codegraphy-symbol text-[1.7rem] text-[#61d8ca]" />
              CodeGraphy
            </Link>
            <p className="mt-5 text-2xl font-medium leading-tight text-white sm:text-3xl">
              Find the shape of your code.
            </p>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/55">
              A local-first Relationship Graph for your CodeGraphy Workspace—built for curious developers and capable agents.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:gap-12">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#61d8ca]">{column.title}</p>
                <ul className="mt-4 grid gap-2.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        className="inline-flex items-center gap-2 text-sm leading-5 text-white/58 transition-colors hover:text-white"
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

        <div className="relative mt-14 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/42 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Joe Soboleski</p>
          <p className="font-mono uppercase tracking-widest">MIT licensed</p>
        </div>
        <p aria-hidden="true" className="footer-wordmark">CodeGraphy</p>
      </div>
    </footer>
  );
}
