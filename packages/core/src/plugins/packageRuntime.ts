import { readCodeGraphyInstalledPluginCache } from './installedCache';
import { prepareActivePluginPackage } from './packageActivation';
import { createPluginActivityState } from './activityState/model';
import { readPackageManifest } from './installedPluginCache/packageReader';
export type {
  LoadedCodeGraphyPluginPackageModule,
  LoadedCodeGraphyWorkspacePluginPackage,
  LoadCodeGraphyWorkspacePluginPackagesOptions,
  PreparedCodeGraphyPluginPackageModule,
  PreparedCodeGraphyWorkspacePluginPackage,
  ResolvedCodeGraphyWorkspacePluginRecords,
} from './packageRuntimeContracts';
import type {
  LoadedCodeGraphyWorkspacePluginPackage,
  LoadCodeGraphyWorkspacePluginPackagesOptions,
  PreparedCodeGraphyWorkspacePluginPackage,
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
  const globalActivationByDescriptor = new Map(
    installedPlugins.map(plugin => [`${plugin.package}\u0000${plugin.id}`, plugin.globallyEnabled] as const),
  );
  const bundledPluginIds = new Set(bundledPlugins.map(getInstalledPluginId));
  const bundledPackages = new Set(bundledPlugins.map(plugin => plugin.package));

  return [
    ...installedPlugins.filter(plugin =>
      !bundledPluginIds.has(getInstalledPluginId(plugin))
      && !bundledPackages.has(plugin.package),
    ),
    ...bundledPlugins.map(plugin => ({
      ...plugin,
      globallyEnabled: globalActivationByDescriptor.get(`${plugin.package}\u0000${plugin.id}`)
        ?? plugin.globallyEnabled,
    })),
  ];
}

export async function resolveCodeGraphyWorkspacePluginRecordsForHost(
  options: LoadCodeGraphyWorkspacePluginPackagesOptions,
  host: string,
): Promise<ResolvedCodeGraphyWorkspacePluginRecords> {
  const resolved = await resolveCodeGraphyWorkspacePluginRecords(options);
  return {
    bundledPackageRoots: resolved.bundledPackageRoots,
    records: resolved.records.filter(record => record.host === host),
  };
}

export async function loadCodeGraphyWorkspacePluginPackages(
  options: LoadCodeGraphyWorkspacePluginPackagesOptions,
): Promise<LoadedCodeGraphyWorkspacePluginPackage[]> {
  const prepared = await prepareCodeGraphyWorkspacePluginPackages(options);
  const warn = options.warn ?? (() => undefined);
  const loaded: LoadedCodeGraphyWorkspacePluginPackage[] = [];

  for (const candidate of prepared) {
    try {
      loaded.push(await candidate.load());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warn(`CodeGraphy plugin '${candidate.record.id}' could not be loaded: ${message}`);
    }
  }

  return loaded;
}

export async function prepareCodeGraphyWorkspacePluginPackages(
  options: LoadCodeGraphyWorkspacePluginPackagesOptions,
): Promise<PreparedCodeGraphyWorkspacePluginPackage[]> {
  const { bundledPackageRoots, records } = await resolveCodeGraphyWorkspacePluginRecordsForHost(
    options,
    'core',
  );
  const warn = options.warn ?? (() => undefined);
  const disabledPluginIds = new Set(options.disabledPlugins ?? []);
  const settingsById = new Map(
    options.settings.plugins.map(plugin => [plugin.id, plugin] as const),
  );
  const prepared: PreparedCodeGraphyWorkspacePluginPackage[] = [];

  for (const record of records) {
    const plugin = await prepareActivePluginPackage({
      bundledPackageRoots,
      disabledPluginIds,
      options,
      record,
      settingsById,
      warn,
    });
    if (plugin) prepared.push(plugin);
  }

  return prepared;
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
