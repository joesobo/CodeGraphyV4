import { Link } from '@/components/link';
import { PageHeader, PageHeaderActions } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { githubTreeHref } from '@/content/links';

const docsSourceLinks: readonly { href: string; label: string }[] = [
  { href: `${githubTreeHref}/docs`, label: 'All docs' },
  { href: `${githubTreeHref}/docs/plugin-api`, label: 'Plugin API docs' },
  { href: `${githubTreeHref}/packages`, label: 'Package READMEs' },
];

export function DocsHeader(): React.ReactElement {
  return (
    <header>
      <PageHeader
        title="Docs"
        description="Every topic links straight to the maintained Markdown in the repo — setup, commands, interactions, settings, the built-in Plugins, and the Plugin API for authors."
      />
      <PageHeaderActions>
        {docsSourceLinks.map((link, index) => (
          <Link
            className={buttonVariants({ variant: index === 0 ? 'default' : 'outline' })}
            href={link.href}
            icon="github"
            key={link.href}
          >
            {link.label}
          </Link>
        ))}
      </PageHeaderActions>
    </header>
  );
}
