import { CorePluginRegistry } from '../plugins/registry';
import {
  prepareCodeGraphyWorkspacePluginPackages,
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
  const warn = options.warn ?? (() => undefined);
  try {
    const preparedPackagePlugins = await prepareCodeGraphyWorkspacePluginPackages({
      disabledPlugins,
      settings,
      workspaceRoot,
      ...(options.userHomeDir ? { homeDir: options.userHomeDir } : {}),
      warn,
    });
    const loadedPackagePlugins: LoadedCodeGraphyWorkspacePluginPackage[] = [];

    await registerDefaultIndexPlugins(registry, { ...options, disabledPlugins }, settings);
    for (const preparedPlugin of preparedPackagePlugins) {
      let loadedPlugin: LoadedCodeGraphyWorkspacePluginPackage;
      try {
        loadedPlugin = await preparedPlugin.load();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        warn(`CodeGraphy plugin '${preparedPlugin.record.id}' could not be loaded: ${message}`);
        continue;
      }

      try {
        registry.register(loadedPlugin.plugin, {
          sourcePackage: loadedPlugin.packageName,
          ...(loadedPlugin.options ? { options: loadedPlugin.options } : {}),
        });
        loadedPackagePlugins.push(loadedPlugin);
      } catch (error) {
        try {
          loadedPlugin.plugin.onUnload?.();
        } catch (unloadError) {
          const message = unloadError instanceof Error ? unloadError.message : String(unloadError);
          warn(
            `CodeGraphy plugin '${loadedPlugin.plugin.id}' could not be unloaded after registration failed: ${message}`,
          );
        }
        const message = error instanceof Error ? error.message : String(error);
        warn(`CodeGraphy plugin '${loadedPlugin.plugin.id}' could not be registered: ${message}`);
      }
    }

    registerProvidedPlugins(registry, options.plugins, disabledPlugins, warn);
    return { registry, loadedPackagePlugins };
  } catch (error) {
    registry.disposeAll();
    throw error;
  }
}
