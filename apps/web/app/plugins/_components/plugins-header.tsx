import { Code } from '@material-symbols-svg/react/rounded';
import { Link } from '@/components/link';
import { PageHeader, PageHeaderActions } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { docsHref, githubHref } from '@/content/links';

export function PluginsHeader(): React.ReactElement {
  return (
    <header>
      <PageHeader
        title="Plugins"
        description="Plugins are npm packages consumed by @codegraphy-dev/core. They are not VS Code companion extensions; core loads enabled plugins during indexing and the extension renders the resulting graph."
      />
      <PageHeaderActions>
        <Link className={buttonVariants()} href={githubHref}>
          <Code aria-hidden="true" />
          Source
        </Link>
        <Link className={buttonVariants({ variant: 'outline' })} href={`${docsHref}#plugin-api`}>
          Plugin API
        </Link>
      </PageHeaderActions>
    </header>
  );
}
