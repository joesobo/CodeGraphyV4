import {
  prepareCodeGraphyWorkspacePluginPackage,
} from './packageLoad';
import type { CodeGraphyInstalledPluginRecord } from './installedCache';
import type {
  LoadedCodeGraphyWorkspacePluginPackage,
  LoadCodeGraphyWorkspacePluginPackagesOptions,
  PreparedCodeGraphyWorkspacePluginPackage,
} from './packageRuntimeContracts';

export async function prepareActivePluginPackage(input: {
  bundledPackageRoots: ReadonlySet<string>;
  disabledPluginIds: ReadonlySet<string>;
  options: LoadCodeGraphyWorkspacePluginPackagesOptions;
  record: CodeGraphyInstalledPluginRecord;
  settingsById: ReadonlyMap<string, LoadCodeGraphyWorkspacePluginPackagesOptions['settings']['plugins'][number]>;
  warn(message: string): void;
}): Promise<PreparedCodeGraphyWorkspacePluginPackage | undefined> {
  const pluginId = input.record.id;
  if (input.disabledPluginIds.has(pluginId)) return undefined;

  const pluginSettings = input.settingsById.get(pluginId) ?? {
    id: pluginId,
    activation: 'inherit' as const,
  };

  try {
    const prepared = await prepareCodeGraphyWorkspacePluginPackage(
      pluginSettings,
      input.record,
      input.options.workspaceRoot,
    );
    const bundled = input.bundledPackageRoots.has(input.record.packageRoot);
    return {
      ...prepared,
      ...(bundled ? { bundled: true } : {}),
      async load(): Promise<LoadedCodeGraphyWorkspacePluginPackage> {
        return {
          ...await prepared.load(),
          ...(bundled ? { bundled: true } : {}),
        };
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    input.warn(`CodeGraphy plugin '${pluginSettings.id}' could not be loaded: ${message}`);
    return undefined;
  }
}
