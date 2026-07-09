import { Link } from '@/components/link';
import { PageHeader, PageHeaderActions } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { docsHref, githubHref } from '@/content/links';

export function PluginsHeader(): React.ReactElement {
  return (
    <header>
      <PageHeader
        title="Plugins"
        description="Plugins are headless npm packages loaded by @codegraphy-dev/core — not companion VS Code extensions. The Core Package runs enabled Plugins during Indexing; the extension renders the Relationship Graph they help build."
      />
      <PageHeaderActions>
        <Link className={buttonVariants()} href={githubHref} icon="github">
          Source
        </Link>
        <Link className={buttonVariants({ variant: 'outline' })} href={`${docsHref}#plugin-api`}>
          Plugin API
        </Link>
      </PageHeaderActions>
    </header>
  );
}
