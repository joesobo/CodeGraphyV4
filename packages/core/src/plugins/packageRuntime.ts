import { readCodeGraphyInstalledPluginCache } from './installedCache';
import { loadActivePluginPackage } from './packageActivation';
import { createPluginActivityState } from './activityState/model';
import { readPackageManifest } from './installedPluginCache/packageReader';
export type {
  LoadedCodeGraphyPluginPackageModule,
  LoadedCodeGraphyWorkspacePluginPackage,
  LoadCodeGraphyWorkspacePluginPackagesOptions,
  ResolvedCodeGraphyWorkspacePluginRecords,
} from './packageRuntimeContracts';
import type {
  LoadedCodeGraphyWorkspacePluginPackage,
  LoadCodeGraphyWorkspacePluginPackagesOptions,
  ResolvedCodeGraphyWorkspacePluginRecords,
} from './packageRuntimeContracts';
import { CODEGRAPHY_MARKDOWN_PLUGIN_ID } from '../workspace/settings';
import type { CodeGraphyInstalledPluginRecord } from './installedCache';

function getInstalledPluginId(record: CodeGraphyInstalledPluginRecord): string {
  return record.id;
}

async function readBundledPluginPackageRecords(
  packageRoots: Iterable<string> = [],
): Promise<CodeGraphyInstalledPluginRecord[]> {
  const recordGroups = await Promise.all(
    [...packageRoots].map(packageRoot => readPackageManifest(packageRoot)),
  );

  return recordGroups.flatMap(records => records ?? []);
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
  const { bundledPackageRoots, records } = await resolveCodeGraphyWorkspacePluginRecords(options);
  const warn = options.warn ?? (() => undefined);
  const disabledPluginIds = new Set(options.disabledPlugins ?? []);
  const settingsById = new Map(
    options.settings.plugins.map(plugin => [plugin.id, plugin] as const),
  );
  const loaded: LoadedCodeGraphyWorkspacePluginPackage[] = [];

  for (const record of records.filter(plugin => plugin.host === 'core')) {
    const plugin = await loadActivePluginPackage({
      bundledPackageRoots,
      disabledPluginIds,
      options,
      record,
      settingsById,
      warn,
    });
    if (plugin) loaded.push(plugin);
  }

  return loaded;
}

export async function resolveCodeGraphyWorkspacePluginRecords(
  options: LoadCodeGraphyWorkspacePluginPackagesOptions,
): Promise<ResolvedCodeGraphyWorkspacePluginRecords> {
  const warn = options.warn ?? (() => undefined);
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

  return {
    bundledPackageRoots,
    records: activityState.packagePlugins,
  };
}
