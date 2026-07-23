import Image from 'next/image';
import { Link, type LinkIcon } from '@/components/link';
import {
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
      { href: marketplaceHref, label: 'Marketplace' },
      { href: githubHref, icon: 'github', label: 'GitHub' },
      { href: vscodeExtensionHref, icon: 'vscode', label: 'VS Code' },
    ],
  },
];

export function Footer(): React.ReactElement {
  const year = new Date().getFullYear();

  return (
    <footer className="relative isolate w-full overflow-hidden bg-[#061321] px-6 text-[#edf3fa] sm:px-8 lg:px-12" id="site-footer">
      <Image
        alt=""
        aria-hidden="true"
        className="footer-image object-cover"
        fill
        sizes="100vw"
        src="/media/ocean-footer-depth-v4.jpg"
      />
      <div className="absolute inset-0 bg-[#061321]/64" />
      <div className="relative z-10 mx-auto max-w-[90rem] py-8 sm:py-9">
        <div className="grid gap-7 lg:grid-cols-[minmax(18rem,1fr)_auto] lg:items-start lg:gap-16">
          <div className="max-w-md">
            <Link
              aria-label="CodeGraphy home"
              className="inline-flex min-h-11 items-center gap-3 text-lg font-semibold"
              href={homeHref}
            >
              <span aria-hidden="true" className="codegraphy-symbol text-[1.7rem] text-[#88b1ff]" />
              CodeGraphy
            </Link>
            <p className="mt-2 text-xl font-medium leading-tight text-white">
              Find the shape of your code.
            </p>
            <p className="mt-1.5 max-w-sm text-sm leading-6 text-white/76">
              A local Relationship Graph for developers and coding agents.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:gap-14 lg:min-w-[22rem]">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[#88b1ff]">{column.title}</p>
                <ul className="mt-2 grid gap-0.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        className="inline-flex min-h-11 items-center gap-2 text-sm leading-5 text-white/72 transition-colors hover:text-white"
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

        <div className="mt-6 flex flex-col gap-2 border-t border-white/14 pt-4 text-xs text-white/68 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Joe Soboleski</p>
          <p className="font-mono uppercase tracking-widest">MIT licensed</p>
        </div>
      </div>
    </footer>
  );
}
