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
  workspaceRoot: string,
  disabledPlugins: ReadonlySet<string> = new Set(options.disabledPlugins ?? []),
): Promise<{
  registry: CorePluginRegistry;
  loadedPackagePlugins: LoadedCodeGraphyWorkspacePluginPackage[];
}> {
  const registry = new CorePluginRegistry();
  try {
    const loadedPackagePlugins = await loadCodeGraphyWorkspacePluginPackages({
      disabledPlugins,
      settings,
      workspaceRoot,
      ...(options.userHomeDir ? { homeDir: options.userHomeDir } : {}),
      ...(options.warn ? { warn: options.warn } : {}),
    });

    await registerDefaultIndexPlugins(registry, { ...options, disabledPlugins }, settings);
    for (const loadedPlugin of loadedPackagePlugins) {
      registry.register(loadedPlugin.plugin, {
        sourcePackage: loadedPlugin.packageName,
        ...(loadedPlugin.options ? { options: loadedPlugin.options } : {}),
      });
    }

    registerProvidedPlugins(registry, options.plugins, disabledPlugins);
    return { registry, loadedPackagePlugins };
  } catch (error) {
    registry.disposeAll();
    throw error;
  }
}
