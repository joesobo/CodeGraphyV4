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
      <dl className="grid border-y border-border sm:grid-cols-3">
        <div className="py-5 sm:border-r sm:border-border sm:px-6 sm:first:pl-0">
          <dt className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">Official packages</dt>
          <dd className="mt-2 font-heading text-4xl font-medium">{pluginContent.length}</dd>
        </div>
        <div className="border-t border-border py-5 sm:border-t-0 sm:border-r sm:px-6">
          <dt className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">Contract</dt>
          <dd className="mt-2 font-heading text-4xl font-medium">API v3</dd>
        </div>
        <div className="border-t border-border py-5 sm:border-t-0 sm:px-6">
          <dt className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">Source model</dt>
          <dd className="mt-2 font-heading text-4xl font-medium">Local-first</dd>
        </div>
      </dl>
      <div className="lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-6">
        <PageSidebar nav={pluginNavGroups} />
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
      </div>
    </section>
  );
}
