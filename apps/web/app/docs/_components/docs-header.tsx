import { MenuBook } from '@material-symbols-svg/react/rounded';
import { Link } from '@/components/link';
import { PageHeader, PageHeaderActions } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { githubTreeHref } from '@/content/links';

const docsSourceLinks = [
  { label: 'All docs', href: `${githubTreeHref}/docs` },
  { label: 'Plugin API docs', href: `${githubTreeHref}/docs/plugin-api` },
  { label: 'Package READMEs', href: `${githubTreeHref}/packages` },
] as const;

export function DocsHeader(): React.ReactElement {
  return (
    <header>
      <PageHeader
        title="Docs"
        description="Every topic links straight to the maintained Markdown in the repo — setup, commands, interactions, settings, the built-in plugins, and the Plugin API for authors."
      />
      <PageHeaderActions>
        {docsSourceLinks.map((link, index) => (
          <Link
            className={buttonVariants({ variant: index === 0 ? 'default' : 'outline' })}
            href={link.href}
            key={link.href}
          >
            <MenuBook aria-hidden="true" />
            {link.label}
          </Link>
        ))}
      </PageHeaderActions>
    </header>
  );
}
