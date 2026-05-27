import type { IPlugin } from '@codegraphy-dev/plugin-api';
import { createMarkdownPlugin } from '@codegraphy-dev/plugin-markdown';
import { readCodeGraphyInstalledPluginCache } from '../plugins/installedCache';
import { createTreeSitterPlugin } from '../treeSitter/plugin';
import {
  createCodeGraphyWorkspacePackageAwarePluginSignature,
} from './signatures';
import {
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  type CodeGraphyWorkspaceSettings,
} from './settings';

function createDefaultStatusRuntimePlugins(
  settings: CodeGraphyWorkspaceSettings,
): Array<Pick<IPlugin, 'id' | 'version'>> {
  const plugins: Array<Pick<IPlugin, 'id' | 'version'>> = [createTreeSitterPlugin()];
  if (settings.plugins.some(plugin => plugin.package === CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME)) {
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
      .map(plugin => [plugin.package, plugin] as const),
  );
  const enabledPackagePlugins = settings.plugins
    .filter(plugin => plugin.package !== CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME);
  const packagePlugins = enabledPackagePlugins
    .map(plugin => installedRecordsByPackage.get(plugin.package))
    .filter((plugin): plugin is NonNullable<typeof plugin> => plugin !== undefined);
  const missingPackagePlugins = enabledPackagePlugins
    .filter(plugin => !installedRecordsByPackage.has(plugin.package))
    .map(plugin => plugin.package);

  return createCodeGraphyWorkspacePackageAwarePluginSignature({
    runtimePlugins: createDefaultStatusRuntimePlugins(settings),
    packagePlugins,
    missingPackagePlugins,
  });
}
