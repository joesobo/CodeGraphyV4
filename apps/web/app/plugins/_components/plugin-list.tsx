import { SectionHeader } from '@/components/section-header';
import { npmRegistryRootUrl } from '@/content/links';
import { pluginContent } from '@/content/plugins';
import { getPackageVersion } from '@/lib/utils';
import { PluginCard } from './plugin-card';

export async function PluginList(): Promise<React.ReactElement> {
  const versions = new Map(
    await Promise.all(
      pluginContent.map(async (plugin) => [
        plugin.packageName,
        await getPackageVersion(
          `${npmRegistryRootUrl}/${encodeURIComponent(plugin.packageName)}/latest`,
        ),
      ] as const),
    ),
  );

  return (
    <section className="grid gap-10" id="plugin-list">
      <SectionHeader
        title="Official Plugins, maintained with the product."
        description="Install a package globally, register it once, enable its Plugin ID for a CodeGraphy Workspace, then run Indexing to add its graph understanding."
      />
      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-secondary px-5 py-4">
          <dt className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">Official packages</dt>
          <dd className="mt-2 font-heading text-4xl font-medium">{pluginContent.length}</dd>
        </div>
        <div className="rounded-2xl bg-secondary px-5 py-4">
          <dt className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">Contract</dt>
          <dd className="mt-2 font-heading text-4xl font-medium">API v3</dd>
        </div>
        <div className="rounded-2xl bg-secondary px-5 py-4">
          <dt className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">Source model</dt>
          <dd className="mt-2 font-heading text-4xl font-medium">Local-first</dd>
        </div>
      </dl>
      <div className="grid gap-5 xl:grid-cols-2">
        {pluginContent.map((plugin) => (
          <PluginCard
            featured={Boolean(plugin.media)}
            key={plugin.id}
            plugin={plugin}
            version={versions.get(plugin.packageName)}
          />
        ))}
      </div>
    </section>
  );
}
