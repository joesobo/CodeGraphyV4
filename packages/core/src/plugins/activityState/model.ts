import type { CodeGraphyInstalledPluginRecord } from '../installedPluginCache/contracts';
import type { CodeGraphyWorkspaceSettings } from '../../workspace/settings';

export interface CreatePluginActivityStateOptions {
  settings: CodeGraphyWorkspaceSettings;
  installedPlugins?: readonly CodeGraphyInstalledPluginRecord[];
  builtInPluginIds?: Iterable<string>;
}

export interface PluginActivityState {
  activePluginIds: ReadonlySet<string>;
  disabledPluginIds: ReadonlySet<string>;
  inactivePluginIds: ReadonlySet<string>;
  packagePlugins: readonly CodeGraphyInstalledPluginRecord[];
  warnings: readonly string[];
}

function getInstalledPluginId(plugin: CodeGraphyInstalledPluginRecord): string {
  return plugin.pluginId ?? plugin.package;
}

function groupInstalledPluginsById(
  installedPlugins: readonly CodeGraphyInstalledPluginRecord[],
): Map<string, CodeGraphyInstalledPluginRecord[]> {
  const byId = new Map<string, CodeGraphyInstalledPluginRecord[]>();
  for (const plugin of installedPlugins) {
    const pluginId = getInstalledPluginId(plugin);
    byId.set(pluginId, [...(byId.get(pluginId) ?? []), plugin]);
  }
  return byId;
}

function createConflictWarning(
  pluginId: string,
  plugins: readonly CodeGraphyInstalledPluginRecord[],
): string {
  return `CodeGraphy plugin '${pluginId}' is enabled but multiple installed packages claim it: ${
    plugins.map(plugin => plugin.package).join(', ')
  }. No runtime was loaded.`;
}

export function createPluginActivityState(
  options: CreatePluginActivityStateOptions,
): PluginActivityState {
  const builtInPluginIds = new Set(options.builtInPluginIds ?? []);
  const installedPluginsById = groupInstalledPluginsById(options.installedPlugins ?? []);
  const activePluginIds = new Set<string>();
  const disabledPluginIds = new Set<string>();
  const inactivePluginIds = new Set<string>();
  const packagePlugins: CodeGraphyInstalledPluginRecord[] = [];
  const warnings: string[] = [];

  for (const plugin of options.settings.plugins) {
    if (!plugin.enabled) {
      disabledPluginIds.add(plugin.id);
      continue;
    }

    if (builtInPluginIds.has(plugin.id)) {
      activePluginIds.add(plugin.id);
      continue;
    }

    const installedPlugins = installedPluginsById.get(plugin.id) ?? [];
    if (installedPlugins.length === 1) {
      activePluginIds.add(plugin.id);
      packagePlugins.push(installedPlugins[0]);
      continue;
    }

    inactivePluginIds.add(plugin.id);
    if (installedPlugins.length > 1) {
      warnings.push(createConflictWarning(plugin.id, installedPlugins));
    } else {
      warnings.push(`CodeGraphy plugin '${plugin.id}' is enabled but not installed. No runtime was loaded.`);
    }
  }

  return {
    activePluginIds,
    disabledPluginIds,
    inactivePluginIds,
    packagePlugins,
    warnings,
  };
}

export function createDisabledPluginSet(
  settings: CodeGraphyWorkspaceSettings,
  disabledPluginsInput: Iterable<string> = [],
): Set<string> {
  const disabledPlugins = new Set(disabledPluginsInput);
  for (const plugin of settings.plugins) {
    if (!plugin.enabled) {
      disabledPlugins.add(plugin.id);
    }
  }
  return disabledPlugins;
}
