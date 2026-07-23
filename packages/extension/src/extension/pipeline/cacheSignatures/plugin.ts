import {
  createCodeGraphyWorkspacePackageAwarePluginSignature,
  createCodeGraphyWorkspacePluginBuildSignature,
  readCodeGraphyInstalledPluginCache,
  type CodeGraphyInstalledPluginRecord,
  type CodeGraphyWorkspacePluginSettings,
} from '@codegraphy-dev/core';

interface RuntimePluginInfo {
  plugin: { id: string; version: string };
  builtIn?: boolean;
  sourcePackage?: string;
  descriptorSignature?: string;
}

export function createWorkspacePipelinePluginBuildSignature(
  plugins: readonly RuntimePluginInfo[],
): string | null {
  return createCodeGraphyWorkspacePluginBuildSignature(
    plugins.flatMap(pluginInfo => (
      !pluginInfo.builtIn && pluginInfo.sourcePackage && pluginInfo.descriptorSignature
        ? [{ id: pluginInfo.plugin.id, signature: pluginInfo.descriptorSignature }]
        : []
    )),
  );
}

function readPackagePlugins(
  plugins: readonly RuntimePluginInfo[],
  installedPlugins: readonly Pick<CodeGraphyInstalledPluginRecord, 'package' | 'version' | 'id'>[],
): Array<Pick<CodeGraphyInstalledPluginRecord, 'package' | 'version' | 'id'>> {
  const installedRecordsById = new Map(
    installedPlugins.map(plugin => [plugin.id, plugin] as const),
  );
  return plugins
    .filter(pluginInfo => !pluginInfo.builtIn && pluginInfo.sourcePackage)
    .map((pluginInfo) => {
      const sourcePackage = pluginInfo.sourcePackage as string;
      return installedRecordsById.get(pluginInfo.plugin.id) ?? {
        package: sourcePackage,
        version: pluginInfo.plugin.version,
        id: pluginInfo.plugin.id,
      };
    });
}

type InstalledPluginIdentity = Pick<
  CodeGraphyInstalledPluginRecord,
  'globallyEnabled' | 'host' | 'id' | 'package' | 'version'
>;

function isEffectivelyEnabledCorePlugin(
  plugin: InstalledPluginIdentity,
  settingsById: ReadonlyMap<string, CodeGraphyWorkspacePluginSettings>,
): boolean {
  if (plugin.host !== 'core') return false;
  const activation = settingsById.get(plugin.id)?.activation ?? 'inherit';
  if (activation === 'enabled') return true;
  if (activation === 'disabled') return false;
  return plugin.globallyEnabled;
}

function findMissingCorePluginIds(
  loadedPluginIds: ReadonlySet<string>,
  installedPlugins: readonly InstalledPluginIdentity[],
  settings: readonly CodeGraphyWorkspacePluginSettings[],
): string[] {
  const settingsById = new Map(settings.map(plugin => [plugin.id, plugin] as const));
  return installedPlugins
    .filter(plugin => isEffectivelyEnabledCorePlugin(plugin, settingsById))
    .map(plugin => plugin.id)
    .filter(pluginId => !loadedPluginIds.has(pluginId));
}

export function createWorkspacePipelinePluginSignature(
  plugins: readonly RuntimePluginInfo[],
  options: {
    installedPlugins?: readonly InstalledPluginIdentity[];
    settings?: { plugins?: readonly CodeGraphyWorkspacePluginSettings[] };
  } = {},
): string | null {
  const installedPlugins = options.installedPlugins ?? readCodeGraphyInstalledPluginCache().plugins;
  const packagePlugins = readPackagePlugins(
    plugins,
    installedPlugins,
  );
  const loadedPluginIds = new Set(packagePlugins.map(plugin => plugin.id));
  const missingPackagePlugins = findMissingCorePluginIds(
    loadedPluginIds,
    installedPlugins,
    options.settings?.plugins ?? [],
  );

  return createCodeGraphyWorkspacePackageAwarePluginSignature({
    runtimePlugins: plugins
      .filter(pluginInfo => pluginInfo.builtIn || !pluginInfo.sourcePackage)
      .map(({ plugin }) => ({ id: plugin.id, version: plugin.version })),
    packagePlugins,
    missingPackagePlugins,
  });
}
