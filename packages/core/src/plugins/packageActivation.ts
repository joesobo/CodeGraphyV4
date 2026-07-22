import { loadCodeGraphyWorkspacePluginPackage } from './packageLoad';
import type { CodeGraphyInstalledPluginRecord } from './installedCache';
import type {
  LoadedCodeGraphyWorkspacePluginPackage,
  LoadCodeGraphyWorkspacePluginPackagesOptions,
} from './packageRuntimeContracts';

export async function loadActivePluginPackage(input: {
  bundledPackageRoots: ReadonlySet<string>;
  disabledPluginIds: ReadonlySet<string>;
  options: LoadCodeGraphyWorkspacePluginPackagesOptions;
  record: CodeGraphyInstalledPluginRecord;
  settingsById: ReadonlyMap<string, LoadCodeGraphyWorkspacePluginPackagesOptions['settings']['plugins'][number]>;
  warn(message: string): void;
}): Promise<LoadedCodeGraphyWorkspacePluginPackage | undefined> {
  const pluginId = input.record.pluginId ?? input.record.package;
  if (input.disabledPluginIds.has(pluginId)) return undefined;

  const pluginSettings = input.settingsById.get(pluginId) ?? {
    id: pluginId,
    activation: 'inherit' as const,
  };

  try {
    const loaded = await loadCodeGraphyWorkspacePluginPackage(
      pluginSettings,
      input.record,
      input.options.workspaceRoot,
    );
    return {
      ...loaded,
      ...(input.bundledPackageRoots.has(input.record.packageRoot) ? { bundled: true } : {}),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    input.warn(`CodeGraphy plugin '${pluginSettings.id}' could not be loaded: ${message}`);
    return undefined;
  }
}
