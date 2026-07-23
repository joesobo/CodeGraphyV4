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
    <section className="grid min-w-0 gap-8" id="plugin-list">
      <SectionHeader
        title="Official Plugins, maintained with the product."
        description="Install a package globally, register it once, enable its Plugin ID for a CodeGraphy Workspace, then run Indexing to add its graph understanding."
      />
      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
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
