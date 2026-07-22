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
  enabledPluginIds: ReadonlySet<string>;
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
  return plugin.id;
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

function getEffectivePluginIds(
  settings: CodeGraphyWorkspaceSettings,
  installedPlugins: readonly CodeGraphyInstalledPluginRecord[],
): string[] {
  return [...new Set([
    ...settings.plugins.map(plugin => plugin.id),
    ...installedPlugins.map(getInstalledPluginId),
  ])];
}

function isPluginEnabled(
  plugin: CodeGraphyWorkspaceSettings['plugins'][number],
  installedPlugins: readonly CodeGraphyInstalledPluginRecord[],
): boolean {
  if (plugin.activation === 'enabled') return true;
  if (plugin.activation === 'disabled') return false;
  return installedPlugins.some(installed => installed.globallyEnabled);
}

export function createPluginActivityState(
  options: CreatePluginActivityStateOptions,
): PluginActivityState {
  const builtInPluginIds = new Set(options.builtInPluginIds ?? []);
  const installedPlugins = options.installedPlugins ?? [];
  const installedPluginsById = groupInstalledPluginsById(installedPlugins);
  const settingsById = new Map(options.settings.plugins.map(plugin => [plugin.id, plugin] as const));
  const activePluginIds = new Set<string>();
  const disabledPluginIds = new Set<string>();
  const enabledPluginIds = new Set<string>();
  const inactivePluginIds = new Set<string>();
  const packagePlugins: CodeGraphyInstalledPluginRecord[] = [];
  const warnings: string[] = [];

  for (const pluginId of getEffectivePluginIds(options.settings, installedPlugins)) {
    const pluginRecords = installedPluginsById.get(pluginId) ?? [];
    const plugin = settingsById.get(pluginId) ?? { id: pluginId, activation: 'inherit' };
    const enabled = isPluginEnabled(plugin, pluginRecords);
    if (enabled) enabledPluginIds.add(pluginId);
    const classification = classifyPluginActivity({
      builtInPluginIds,
      enabled,
      installedPlugins: pluginRecords,
      plugin,
    });
    applyPluginClassification(pluginId, classification, {
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
    enabledPluginIds,
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
    if (plugin.activation === 'disabled') {
      disabledPlugins.add(plugin.id);
    }
  }
  return disabledPlugins;
}
