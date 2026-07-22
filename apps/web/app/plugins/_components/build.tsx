import { Link } from '@/components/link';
import { SectionHeader } from '@/components/section-header';
import { buttonVariants } from '@/components/ui/button';
import { docsHref, npmPackageRootHref } from '@/content/links';

const buildSteps = [
  {
    title: 'Start with the Plugin API package',
    body: 'Install @codegraphy-dev/plugin-api as a development dependency and use type-only imports for the public Plugin contracts.',
  },
  {
    title: 'Describe package metadata before runtime code',
    body: 'The Core Package validates package.json#codegraphy and codegraphy.json before importing a Plugin runtime, so registration can stay safe and deterministic.',
  },
  {
    title: 'Keep the Plugin headless',
    body: 'Plugins communicate with @codegraphy-dev/core. The VS Code extension handles VS Code lifecycle, editor integration, and Relationship Graph rendering.',
  },
] as const;

const pluginApiPackageHref = `${npmPackageRootHref}/@codegraphy-dev/plugin-api`;

export function Build(): React.ReactElement {
  return (
    <section
      className="overflow-hidden rounded-3xl bg-[#0b1e35] px-6 py-12 text-white sm:px-10 sm:py-14 [&_.section-kicker]:text-[#a8c7ff] [&_h2]:text-white [&_p]:text-white/82"
      id="build"
    >
      <div className="grid gap-8 lg:grid-cols-[0.85fr_1fr] lg:items-center">
        <div className="max-w-xl">
          <SectionHeader
            title="Build your own"
            description="Plugins are headless npm packages. Start from the typed contracts in the Plugin API package, describe your metadata, and let the Core Package handle loading, Indexing, and rendering."
          />
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className={buttonVariants()} href={`${docsHref}#plugin-api`}>
              Plugin API docs
            </Link>
            <Link className={buttonVariants({ variant: 'outline' })} href={pluginApiPackageHref}>
              @codegraphy-dev/plugin-api
            </Link>
          </div>
        </div>

        <ol className="border-y border-white/18">
          {buildSteps.map((step, index) => (
            <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-4 border-b border-white/18 py-5 last:border-b-0" key={step.title}>
              <span className="font-mono text-xs font-semibold text-[#a8c7ff]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-medium text-white">{step.title}</h3>
                <p className="mt-1 text-sm leading-6 text-white/72">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
