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
    summary: 'Return per-file analysis with symbols, relationships, Node Types, Edge Types, and plugin-owned graph evidence.',
  },
  {
    icon: Sync,
    title: 'Incremental updates',
    summary: 'Respond to file-change hooks and keep cross-file indexes fresh without requiring a full workspace re-read every time.',
  },
  {
    icon: DataObject,
    title: 'Static metadata',
    summary: 'Declare package identity, Plugin ID, API compatibility, supported extensions, defaults, filters, and capability disclosures.',
  },
  {
    icon: Settings,
    title: 'Workspace settings',
    summary: 'Read plugin options through the plugin context and store workspace-local plugin data under the plugin-owned namespace.',
  },
  {
    icon: Hub,
    title: 'Graph View roles',
    summary: 'Contribute plugin-owned node/edge concepts, filter defaults, file colors, and webview assets without importing VS Code.',
  },
];

export function PluginFeatures(): React.ReactElement {
  return (
    <section className="grid gap-6" id="features">
      <SectionHeader
        title="Plugin features"
        description="Plugins add graph understanding to core while staying independent of VS Code."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {pluginFeatures.map((capability) => (
          <Card as="article" key={capability.title}>
            <CardHeader>
              <div className="mb-2">
                <span className="flex size-9 items-center justify-center rounded-md bg-secondary text-primary">
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
