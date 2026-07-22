import {
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  createCodeGraphyWorkspacePackageAwarePluginSignature,
  readCodeGraphyInstalledPluginCache,
  type CodeGraphyInstalledPluginRecord,
  type CodeGraphyWorkspacePluginSettings,
} from '@codegraphy-dev/core';

interface RuntimePluginInfo {
  plugin: { id: string; version: string };
  builtIn?: boolean;
  sourcePackage?: string;
}

function readPackagePlugins(
  plugins: readonly RuntimePluginInfo[],
  installedPlugins: readonly Pick<CodeGraphyInstalledPluginRecord, 'package' | 'version' | 'id'>[],
): Array<Pick<CodeGraphyInstalledPluginRecord, 'package' | 'version' | 'id'>> {
  const installedRecordsByPackage = new Map(
    installedPlugins.map(plugin => [plugin.package, plugin] as const),
  );
  return plugins
    .filter(pluginInfo => !pluginInfo.builtIn && pluginInfo.sourcePackage)
    .map((pluginInfo) => {
      const sourcePackage = pluginInfo.sourcePackage as string;
      return installedRecordsByPackage.get(sourcePackage) ?? {
        package: sourcePackage,
        version: pluginInfo.plugin.version,
        id: pluginInfo.plugin.id,
      };
    });
}

export function createWorkspacePipelinePluginSignature(
  plugins: readonly RuntimePluginInfo[],
  options: {
    installedPlugins?: ReadonlyArray<Pick<CodeGraphyInstalledPluginRecord, 'package' | 'version' | 'id'>>;
    settings?: { plugins?: readonly CodeGraphyWorkspacePluginSettings[] };
  } = {},
): string | null {
  const packagePlugins = readPackagePlugins(
    plugins,
    options.installedPlugins ?? readCodeGraphyInstalledPluginCache().plugins,
  );
  const loadedPluginIds = new Set(packagePlugins.map(plugin => plugin.id));
  const missingPackagePlugins = (options.settings?.plugins ?? [])
    .filter(plugin => plugin.activation !== 'disabled' && plugin.id !== CODEGRAPHY_MARKDOWN_PLUGIN_ID)
    .map(plugin => plugin.id)
    .filter(pluginId => !loadedPluginIds.has(pluginId));

  return createCodeGraphyWorkspacePackageAwarePluginSignature({
    runtimePlugins: plugins
      .filter(pluginInfo => pluginInfo.builtIn || !pluginInfo.sourcePackage)
      .map(({ plugin }) => ({ id: plugin.id, version: plugin.version })),
    packagePlugins,
    missingPackagePlugins,
  });
}
