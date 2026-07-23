import {
  DataObject,
  Hub,
  Science,
  Settings,
  Sync,
  type MaterialSymbolsComponent,
} from '@material-symbols-svg/react/rounded';
import { SectionHeader } from '@/components/section-header';

const pluginFeatures: { icon: MaterialSymbolsComponent; title: string; summary: string }[] = [
  {
    icon: Science,
    title: 'Analysis',
    summary: 'Contribute per-file symbols and Relationships during Indexing, including custom Node Types and Edge Types the Plugin owns.',
  },
  {
    icon: Sync,
    title: 'Incremental updates',
    summary: 'React to file-change hooks so cross-file indexes stay fresh without re-reading the whole CodeGraphy Workspace on every save.',
  },
  {
    icon: DataObject,
    title: 'Static metadata',
    summary: 'Declare package identity, Plugin ID, API compatibility, supported extensions, defaults, Filters, and capability disclosures.',
  },
  {
    icon: Settings,
    title: 'Workspace settings',
    summary: 'Read Plugin options through the Plugin context and store workspace-local Plugin data under the Plugin-owned namespace.',
  },
  {
    icon: Hub,
    title: 'Graph View roles',
    summary: 'Ship Node and Edge styling, Filter defaults, file colors, and webview assets without importing VS Code.',
  },
];

export function PluginFeatures(): React.ReactElement {
  return (
    <section className="grid gap-9" id="features">
      <SectionHeader
        title="More meaning, without a heavier Core."
        description="Plugins enrich the Relationship Graph through a typed, headless contract while the Core Package keeps Indexing, caching, queries, and lifecycle behavior consistent."
      />
      <div className="grid gap-x-10 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
        {pluginFeatures.map((capability) => (
          <article key={capability.title}>
            <span className="grid size-10 place-items-center rounded-xl bg-secondary">
              <capability.icon aria-hidden="true" className="size-5 text-primary" />
            </span>
            <h3 className="mt-4 text-xl font-medium">{capability.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{capability.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
