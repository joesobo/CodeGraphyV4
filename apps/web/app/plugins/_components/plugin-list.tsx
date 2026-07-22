import { PageSidebar } from '@/components/nav/page-sidebar';
import { SectionHeader } from '@/components/section-header';
import { npmRegistryRootUrl } from '@/content/links';
import { pluginNavGroups } from '@/content/navigation';
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
    <section className="grid gap-12" id="plugin-list">
      <SectionHeader
        title="Official Plugins, maintained with the product."
        description="Install a package globally, register it once, enable its Plugin ID for a CodeGraphy Workspace, then run Indexing to add its graph understanding."
      />
      <div className="lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-6">
        <PageSidebar nav={pluginNavGroups} />
        <div className="grid gap-4 xl:grid-cols-2">
          {pluginContent.map((plugin) => (
            <PluginCard key={plugin.id} plugin={plugin} version={versions.get(plugin.packageName)} />
          ))}
        </div>
      </div>
    </section>
  );
}
