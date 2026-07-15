import type { CodeGraphyInstalledPluginRecord } from '../installedPluginCache/contracts';
import type { CodeGraphyWorkspaceSettings } from '../../workspace/settings';
import { classifyPluginActivity } from './classification';
import type { PluginActivityClassification } from './classification';

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

function applyPluginClassification(
  pluginId: string,
  classification: PluginActivityClassification,
  state: {
    activePluginIds: Set<string>;
    disabledPluginIds: Set<string>;
    inactivePluginIds: Set<string>;
    packagePlugins: CodeGraphyInstalledPluginRecord[];
    warnings: string[];
  },
): void {
  if (classification.kind === 'disabled') state.disabledPluginIds.add(pluginId);
  if (classification.kind === 'active-built-in') state.activePluginIds.add(pluginId);
  if (classification.kind === 'active-package') {
    state.activePluginIds.add(pluginId);
    state.packagePlugins.push(classification.record);
  }
  if (classification.kind === 'inactive') {
    state.inactivePluginIds.add(pluginId);
    state.warnings.push(classification.warning);
  }
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
    const installedPlugins = installedPluginsById.get(plugin.id) ?? [];
    const classification = classifyPluginActivity({ builtInPluginIds, installedPlugins, plugin });
    applyPluginClassification(plugin.id, classification, {
      activePluginIds,
      disabledPluginIds,
      inactivePluginIds,
      packagePlugins,
      warnings,
    });
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
