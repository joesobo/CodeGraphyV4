import { readCodeGraphyInstalledPluginCache } from './installedCache';
import { loadCodeGraphyWorkspacePluginPackage } from './packageLoad';
import { createPluginActivityState } from './activityState/model';
export type {
  LoadedCodeGraphyWorkspacePluginPackage,
  LoadCodeGraphyWorkspacePluginPackagesOptions,
} from './packageRuntimeContracts';
import type {
  LoadedCodeGraphyWorkspacePluginPackage,
  LoadCodeGraphyWorkspacePluginPackagesOptions,
} from './packageRuntimeContracts';
import { CODEGRAPHY_MARKDOWN_PLUGIN_ID } from '../workspace/settings';
import type { CodeGraphyInstalledPluginRecord } from './installedCache';

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
  const installedPlugins = readCodeGraphyInstalledPluginCache({ homeDir: options.homeDir }).plugins;
  const activityState = createPluginActivityState({
    settings: options.settings,
    installedPlugins,
    builtInPluginIds: [CODEGRAPHY_MARKDOWN_PLUGIN_ID],
  });
  for (const warning of activityState.warnings) {
    warn(warning);
  }

  const settingsById = new Map(
    options.settings.plugins.map(plugin => [plugin.id, plugin] as const),
  );
  const loaded: LoadedCodeGraphyWorkspacePluginPackage[] = [];

  for (const record of activityState.packagePlugins) {
    const pluginId = getInstalledPluginId(record);
    if (disabledPlugins.has(pluginId)) {
      continue;
    }

    const pluginSettings = settingsById.get(pluginId);
    if (!pluginSettings) {
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
