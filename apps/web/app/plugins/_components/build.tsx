import { OpenInNew } from '@material-symbols-svg/react/rounded';
import { Link } from '@/components/link';
import { SectionHeader } from '@/components/section-header';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { docsHref, npmPackageRootHref } from '@/content/links';

const buildSteps = [
  {
    title: 'Start with the Plugin API package',
    body: 'Install @codegraphy-dev/plugin-api as a development dependency and use type-only imports for the public plugin contracts.',
  },
  {
    title: 'Describe package metadata before runtime code',
    body: 'Core validates package.json#codegraphy and codegraphy.json before importing a plugin runtime, so registration can stay safe and deterministic.',
  },
  {
    title: 'Keep the plugin headless',
    body: 'Plugins communicate with @codegraphy-dev/core. The VS Code extension handles VS Code lifecycle, editor integration, and UI rendering.',
  },
] as const;

const pluginApiPackageHref = `${npmPackageRootHref}/@codegraphy-dev/plugin-api`;

export function Build(): React.ReactElement {
  return (
    <section
      className="overflow-hidden rounded-lg bg-secondary px-6 py-9 sm:px-10 sm:py-11"
      id="build"
    >
      <div className="grid gap-8 lg:grid-cols-[0.85fr_1fr] lg:items-center">
        <div className="max-w-xl">
          <SectionHeader
            title="Build your own"
            description="Plugins are headless npm packages. Start from the typed contracts in the Plugin API package, describe your metadata, and let core handle loading, indexing, and rendering."
          />
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className={buttonVariants()} href={`${docsHref}#plugin-api`}>
              Plugin API docs
              <OpenInNew aria-hidden="true" />
            </Link>
            <Link className={buttonVariants({ variant: 'outline' })} href={pluginApiPackageHref}>
              @codegraphy-dev/plugin-api
            </Link>
          </div>
        </div>

        <ol className="grid gap-3">
          {buildSteps.map((step, index) => (
            <Card as="li" className="rounded-lg" key={step.title}>
              <CardHeader className="flex-row gap-4 p-4">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm">{step.title}</CardTitle>
                  <CardDescription className="mt-1">{step.body}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </ol>
      </div>
    </section>
  );
}
