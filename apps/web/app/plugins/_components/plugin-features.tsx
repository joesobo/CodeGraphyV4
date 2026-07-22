import {
  DataObject,
  Hub,
  Science,
  Settings,
  Sync,
  type MaterialSymbolsComponent,
} from '@material-symbols-svg/react/rounded';
import { SectionHeader } from '@/components/section-header';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
    summary: 'Ship Node and Edge styling, Filter defaults, file colors, and webview assets — all without importing VS Code.',
  },
];

export function PluginFeatures(): React.ReactElement {
  return (
    <section className="grid gap-12" id="features">
      <SectionHeader
        title="More meaning, without a heavier Core."
        description="Plugins enrich the Relationship Graph through a typed, headless contract while the Core Package keeps Indexing, caching, queries, and lifecycle behavior consistent."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {pluginFeatures.map((capability) => (
          <Card as="article" className="rounded-3xl bg-card/75" key={capability.title}>
            <CardHeader>
              <div className="mb-2">
                <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-primary">
                  <capability.icon aria-hidden="true" className="size-4.5" />
                </span>
              </div>
              <CardTitle className="text-base">{capability.title}</CardTitle>
              <CardDescription>{capability.summary}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}
