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
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  type CodeGraphyWorkspacePluginSettings,
} from '../workspace/settings';
import type { CodeGraphyInstalledPluginRecord } from './installedCache';

function shouldLoadPackagePlugin(settings: CodeGraphyWorkspacePluginSettings): boolean {
  return settings.package !== CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME;
}

function isInstalledPluginRecordDisabled(
  record: CodeGraphyInstalledPluginRecord,
  disabledPlugins: ReadonlySet<string>,
): boolean {
  return !!record.pluginId && disabledPlugins.has(record.pluginId);
}

export async function loadCodeGraphyWorkspacePluginPackages(
  options: LoadCodeGraphyWorkspacePluginPackagesOptions,
): Promise<LoadedCodeGraphyWorkspacePluginPackage[]> {
  const warn = options.warn ?? (() => undefined);
  const disabledPlugins = new Set(options.disabledPlugins ?? []);
  const recordsByPackage = new Map(
    readCodeGraphyInstalledPluginCache({ homeDir: options.homeDir })
      .plugins
      .map(record => [record.package, record] as const),
  );
  const loaded: LoadedCodeGraphyWorkspacePluginPackage[] = [];

  for (const pluginSettings of options.settings.plugins.filter(shouldLoadPackagePlugin)) {
    const record = recordsByPackage.get(pluginSettings.package);
    if (!record) {
      warn(`CodeGraphy plugin package '${pluginSettings.package}' is enabled but not installed.`);
      continue;
    }
    if (isInstalledPluginRecordDisabled(record, disabledPlugins)) {
      continue;
    }

    try {
      loaded.push(await loadCodeGraphyWorkspacePluginPackage(pluginSettings, record, options.workspaceRoot));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warn(`CodeGraphy plugin package '${pluginSettings.package}' could not be loaded: ${message}`);
    }
  }

  return loaded;
}
