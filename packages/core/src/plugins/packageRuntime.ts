import { readCodeGraphyInstalledPluginCache } from './installedCache';
import { loadCodeGraphyWorkspacePluginPackage } from './packageLoad';
import { createPluginActivityState } from './activityState/model';
import { readPackageManifest } from './installedPluginCache/packageReader';
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

async function readBundledPluginPackageRecords(
  packageRoots: Iterable<string> = [],
): Promise<CodeGraphyInstalledPluginRecord[]> {
  const records = await Promise.all(
    [...packageRoots].map(packageRoot => readPackageManifest(packageRoot)),
  );

  return records.filter((record): record is CodeGraphyInstalledPluginRecord => record !== null);
}

function preferBundledPluginRecords(
  installedPlugins: readonly CodeGraphyInstalledPluginRecord[],
  bundledPlugins: readonly CodeGraphyInstalledPluginRecord[],
): CodeGraphyInstalledPluginRecord[] {
  const bundledPluginIds = new Set(bundledPlugins.map(getInstalledPluginId));
  const bundledPackages = new Set(bundledPlugins.map(plugin => plugin.package));

  return [
    ...installedPlugins.filter(plugin =>
      !bundledPluginIds.has(getInstalledPluginId(plugin))
      && !bundledPackages.has(plugin.package),
    ),
    ...bundledPlugins,
  ];
}

export async function loadCodeGraphyWorkspacePluginPackages(
  options: LoadCodeGraphyWorkspacePluginPackagesOptions,
): Promise<LoadedCodeGraphyWorkspacePluginPackage[]> {
  const warn = options.warn ?? (() => undefined);
  const disabledPlugins = new Set(options.disabledPlugins ?? []);
  const installedPlugins = readCodeGraphyInstalledPluginCache({ homeDir: options.homeDir }).plugins;
  const bundledPlugins = await readBundledPluginPackageRecords(options.bundledPackageRoots);
  const bundledPackageRoots = new Set(bundledPlugins.map(plugin => plugin.packageRoot));
  const activityState = createPluginActivityState({
    settings: options.settings,
    installedPlugins: preferBundledPluginRecords(installedPlugins, bundledPlugins),
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
      if (options.shouldActivatePlugin && !await options.shouldActivatePlugin(record)) {
        continue;
      }
      const loadedPlugin = await loadCodeGraphyWorkspacePluginPackage(pluginSettings, record, options.workspaceRoot);
      loaded.push({
        ...loadedPlugin,
        ...(bundledPackageRoots.has(record.packageRoot) ? { bundled: true } : {}),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warn(`CodeGraphy plugin '${pluginSettings.id}' could not be loaded: ${message}`);
    }
  }

  return loaded;
}
