import type { IPlugin } from '@codegraphy-dev/plugin-api';
import { createMarkdownPlugin } from '@codegraphy-dev/plugin-markdown';
import { readCodeGraphyInstalledPluginCache } from '../plugins/installedCache';
import { createTreeSitterPlugin } from '../treeSitter/plugin';
import {
  createCodeGraphyWorkspacePackageAwarePluginSignature,
} from './signatures';
import {
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  type CodeGraphyWorkspaceSettings,
} from './settings';

function createDefaultStatusRuntimePlugins(
  settings: CodeGraphyWorkspaceSettings,
): Array<Pick<IPlugin, 'id' | 'version'>> {
  const plugins: Array<Pick<IPlugin, 'id' | 'version'>> = [createTreeSitterPlugin()];
  if (settings.plugins.some(plugin => plugin.id === CODEGRAPHY_MARKDOWN_PLUGIN_ID && plugin.enabled)) {
    plugins.push(createMarkdownPlugin());
  }
  return plugins;
}

export function createDefaultStatusPluginSignature(
  settings: CodeGraphyWorkspaceSettings,
  homeDir: string | undefined,
): string | null {
  const installedRecordsByPackage = new Map(
    readCodeGraphyInstalledPluginCache({
      ...(homeDir ? { homeDir } : {}),
    })
      .plugins
      .map(plugin => [plugin.pluginId ?? plugin.package, plugin] as const),
  );
  const enabledPackagePlugins = settings.plugins
    .filter(plugin => plugin.enabled && plugin.id !== CODEGRAPHY_MARKDOWN_PLUGIN_ID);
  const packagePlugins = enabledPackagePlugins
    .map(plugin => installedRecordsByPackage.get(plugin.id))
    .filter((plugin): plugin is NonNullable<typeof plugin> => plugin !== undefined);
  const missingPackagePlugins = enabledPackagePlugins
    .filter(plugin => !installedRecordsByPackage.has(plugin.id))
    .map(plugin => plugin.id);

  return createCodeGraphyWorkspacePackageAwarePluginSignature({
    runtimePlugins: createDefaultStatusRuntimePlugins(settings),
    packagePlugins,
    missingPackagePlugins,
  });
}
