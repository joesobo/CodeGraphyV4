import { readCodeGraphyInstalledPluginCache } from './installedCache';
import { loadCodeGraphyWorkspacePluginPackage } from './packageLoad';
export type {
  LoadedCodeGraphyWorkspacePluginPackage,
  LoadCodeGraphyWorkspacePluginPackagesOptions,
} from './packageRuntimeContracts';
import type {
  LoadedCodeGraphyWorkspacePluginPackage,
  LoadCodeGraphyWorkspacePluginPackagesOptions,
} from './packageRuntimeContracts';
import {
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  type CodeGraphyWorkspacePluginSettings,
} from '../workspace/settings';
import type { CodeGraphyInstalledPluginRecord } from './installedCache';

function shouldLoadPackagePlugin(settings: CodeGraphyWorkspacePluginSettings): boolean {
  return settings.enabled && settings.id !== CODEGRAPHY_MARKDOWN_PLUGIN_ID;
}

function getInstalledPluginId(record: CodeGraphyInstalledPluginRecord): string {
  return record.pluginId ?? record.package;
}

function isInstalledPluginRecordDisabled(
  record: CodeGraphyInstalledPluginRecord,
  disabledPlugins: ReadonlySet<string>,
): boolean {
  return disabledPlugins.has(getInstalledPluginId(record));
}

export async function loadCodeGraphyWorkspacePluginPackages(
  options: LoadCodeGraphyWorkspacePluginPackagesOptions,
): Promise<LoadedCodeGraphyWorkspacePluginPackage[]> {
  const warn = options.warn ?? (() => undefined);
  const disabledPlugins = new Set(options.disabledPlugins ?? []);
  const recordsByPluginId = new Map(
    readCodeGraphyInstalledPluginCache({ homeDir: options.homeDir })
      .plugins
      .map(record => [getInstalledPluginId(record), record] as const),
  );
  const loaded: LoadedCodeGraphyWorkspacePluginPackage[] = [];

  for (const pluginSettings of options.settings.plugins.filter(shouldLoadPackagePlugin)) {
    if (disabledPlugins.has(pluginSettings.id)) {
      continue;
    }

    const record = recordsByPluginId.get(pluginSettings.id);
    if (!record) {
      warn(`CodeGraphy plugin '${pluginSettings.id}' is enabled but not installed.`);
      continue;
    }
    if (isInstalledPluginRecordDisabled(record, disabledPlugins)) {
      continue;
    }

    try {
      loaded.push(await loadCodeGraphyWorkspacePluginPackage(pluginSettings, record, options.workspaceRoot));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warn(`CodeGraphy plugin '${pluginSettings.id}' could not be loaded: ${message}`);
    }
  }

  return loaded;
}
