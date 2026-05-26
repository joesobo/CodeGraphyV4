import { CorePluginRegistry } from '../plugins/registry';
import {
  loadCodeGraphyWorkspacePluginPackages,
  type LoadedCodeGraphyWorkspacePluginPackage,
} from '../plugins/packageRuntime';
import type { CodeGraphyWorkspaceSettings } from '../workspace/settings';
import type { IndexCodeGraphyWorkspaceOptions } from './contracts';
import { registerDefaultIndexPlugins, registerProvidedPlugins } from './defaultPlugins';

export async function createWorkspaceIndexRegistry(
  options: IndexCodeGraphyWorkspaceOptions,
  settings: CodeGraphyWorkspaceSettings,
): Promise<{
  registry: CorePluginRegistry;
  loadedPackagePlugins: LoadedCodeGraphyWorkspacePluginPackage[];
}> {
  const registry = new CorePluginRegistry();
  const loadedPackagePlugins = await loadCodeGraphyWorkspacePluginPackages({
    settings,
    ...(options.userHomeDir ? { homeDir: options.userHomeDir } : {}),
    ...(options.warn ? { warn: options.warn } : {}),
  });

  registerDefaultIndexPlugins(registry, options, settings);
  for (const loadedPlugin of loadedPackagePlugins) {
    registry.register(loadedPlugin.plugin, {
      sourcePackage: loadedPlugin.packageName,
      ...(loadedPlugin.options ? { options: loadedPlugin.options } : {}),
    });
  }

  registerProvidedPlugins(registry, options.plugins);
  return { registry, loadedPackagePlugins };
}
