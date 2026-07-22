import {
  readCodeGraphyWorkspaceSettingsOrInitial,
  writeCodeGraphyWorkspaceSettings,
} from '../../workspace/settings';
import type { IPluginUpdateImpact, IPluginUpdateImpactPolicy } from '@codegraphy-dev/plugin-api';
import type { CodeGraphyWorkspacePluginSettings } from '../../workspace/settings';
import type { CodeGraphyInstalledPluginRecord } from './contracts';

export interface UpdateCodeGraphyWorkspacePluginSelectionOptions {
  pluginId: string;
  activation: CodeGraphyWorkspacePluginSettings['activation'];
  defaultOptions?: Record<string, unknown>;
  updateImpact?: IPluginUpdateImpactPolicy;
}

export interface CodeGraphyWorkspacePluginToggleOptions
  extends Omit<UpdateCodeGraphyWorkspacePluginSelectionOptions, 'activation'> {
  enabled: boolean;
}

export type CodeGraphyWorkspacePluginIndexingPlan =
  | { kind: 'projection-only' }
  | { kind: 'analyze-workspace' }
  | { kind: 'reprocess-plugin-files'; pluginIds: string[] };

export type CodeGraphyWorkspacePluginSettingUpdateIndexingPlan =
  | { kind: 'settings-only' }
  | CodeGraphyWorkspacePluginIndexingPlan;

export interface CodeGraphyWorkspacePluginTogglePlan {
  plugins: CodeGraphyWorkspacePluginSettings[];
  indexing: CodeGraphyWorkspacePluginIndexingPlan;
}

export interface CodeGraphyWorkspacePluginSettingUpdatePlanOptions {
  pluginId: string;
  settingKeys: readonly string[];
  updateImpact?: IPluginUpdateImpactPolicy;
}

export function updateCodeGraphyWorkspacePluginSelection(
  plugins: readonly CodeGraphyWorkspacePluginSettings[],
  options: UpdateCodeGraphyWorkspacePluginSelectionOptions,
): CodeGraphyWorkspacePluginSettings[] {
  const existingIndex = plugins.findIndex(plugin => plugin.id === options.pluginId);
  const nextPlugin: CodeGraphyWorkspacePluginSettings = {
    ...(existingIndex >= 0 ? plugins[existingIndex] : {}),
    id: options.pluginId,
    activation: options.activation,
  };
  if (options.defaultOptions && Object.keys(options.defaultOptions).length > 0) {
    nextPlugin.options = {
      ...options.defaultOptions,
      ...nextPlugin.options,
    };
  }

  if (existingIndex < 0) {
    return [...plugins, nextPlugin];
  }

  return plugins.map((plugin, index) => index === existingIndex ? nextPlugin : plugin);
}

export function createCodeGraphyWorkspacePluginTogglePlan(
  plugins: readonly CodeGraphyWorkspacePluginSettings[],
  options: CodeGraphyWorkspacePluginToggleOptions,
): CodeGraphyWorkspacePluginTogglePlan {
  return {
    plugins: updateCodeGraphyWorkspacePluginSelection(plugins, {
      ...options,
      activation: options.enabled ? 'enabled' : 'disabled',
    }),
    indexing: createPluginToggleIndexingPlan(
      options.pluginId,
      options.enabled,
      options.updateImpact?.toggle,
    ),
  };
}

export function createCodeGraphyWorkspacePluginSettingUpdateIndexingPlan(
  options: CodeGraphyWorkspacePluginSettingUpdatePlanOptions,
): CodeGraphyWorkspacePluginSettingUpdateIndexingPlan {
  const impact = getHighestImpact(
    getPluginSettingImpacts(options.updateImpact, options.settingKeys),
  );
  switch (impact) {
    case 'view-only':
    case 'settings-only':
      return { kind: 'settings-only' };
    case 'projection-only':
      return { kind: 'projection-only' };
    case 'reanalyze-plugin-files':
      return { kind: 'reprocess-plugin-files', pluginIds: [options.pluginId] };
    case 'requires-full-index':
    default:
      return { kind: 'analyze-workspace' };
  }
}

function createPluginToggleIndexingPlan(
  pluginId: string,
  enabled: boolean,
  impact: IPluginUpdateImpact | undefined,
): CodeGraphyWorkspacePluginIndexingPlan {
  if (!enabled) {
    return { kind: 'projection-only' };
  }

  return createPluginUpdateIndexingPlan(pluginId, impact);
}

function createPluginUpdateIndexingPlan(
  pluginId: string,
  impact: IPluginUpdateImpact | undefined,
): CodeGraphyWorkspacePluginIndexingPlan {
  switch (impact) {
    case 'view-only':
    case 'settings-only':
    case 'projection-only':
      return { kind: 'projection-only' };
    case 'reanalyze-plugin-files':
      return { kind: 'reprocess-plugin-files', pluginIds: [pluginId] };
    case 'requires-full-index':
    default:
      return { kind: 'analyze-workspace' };
  }
}

function getPluginSettingImpacts(
  updateImpact: IPluginUpdateImpactPolicy | undefined,
  settingKeys: readonly string[],
): IPluginUpdateImpact[] {
  if (settingKeys.length === 0) {
    return [updateImpact?.defaultSetting].filter((impact): impact is IPluginUpdateImpact =>
      impact !== undefined,
    );
  }

  return settingKeys.map(settingKey =>
    updateImpact?.settings?.[settingKey] ?? updateImpact?.defaultSetting ?? 'requires-full-index',
  );
}

function getHighestImpact(impacts: readonly IPluginUpdateImpact[]): IPluginUpdateImpact | undefined {
  if (impacts.includes('requires-full-index')) {
    return 'requires-full-index';
  }
  if (impacts.includes('reanalyze-plugin-files')) {
    return 'reanalyze-plugin-files';
  }
  if (impacts.includes('projection-only')) {
    return 'projection-only';
  }
  if (impacts.includes('settings-only')) {
    return 'settings-only';
  }
  if (impacts.includes('view-only')) {
    return 'view-only';
  }
  return undefined;
}

export function enableCodeGraphyWorkspacePlugin(
  workspaceRoot: string,
  plugin: CodeGraphyInstalledPluginRecord,
): void {
  const settings = readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot);
  const pluginId = plugin.pluginId ?? plugin.package;
  const existingIndex = settings.plugins.findIndex(entry => entry.id === pluginId);
  const entry = {
    id: pluginId,
    activation: 'enabled' as const,
    ...(plugin.defaultOptions ? { options: { ...plugin.defaultOptions } } : {}),
  };

  const plugins = [...settings.plugins];
  if (existingIndex >= 0) {
    const mergedOptions = {
      ...plugin.defaultOptions,
      ...plugins[existingIndex]?.options,
    };
    plugins[existingIndex] = {
      ...plugins[existingIndex],
      id: pluginId,
      activation: 'enabled',
      ...(Object.keys(mergedOptions).length > 0 ? { options: mergedOptions } : {}),
    };
  } else {
    plugins.push(entry);
  }

  writeCodeGraphyWorkspaceSettings(workspaceRoot, {
    ...settings,
    plugins: updateCodeGraphyWorkspacePluginSelection(plugins, {
      pluginId,
      activation: 'enabled',
      defaultOptions: plugin.defaultOptions,
      updateImpact: plugin.updateImpact,
    }),
  });
}

export function disableCodeGraphyWorkspacePlugin(
  workspaceRoot: string,
  pluginId: string,
): void {
  const settings = readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot);
  writeCodeGraphyWorkspaceSettings(workspaceRoot, {
    ...settings,
    plugins: updateCodeGraphyWorkspacePluginSelection(settings.plugins, {
      pluginId,
      activation: 'disabled',
    }),
  });
}

export function inheritCodeGraphyWorkspacePlugin(
  workspaceRoot: string,
  pluginId: string,
): void {
  const settings = readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot);
  writeCodeGraphyWorkspaceSettings(workspaceRoot, {
    ...settings,
    plugins: updateCodeGraphyWorkspacePluginSelection(settings.plugins, {
      pluginId,
      activation: 'inherit',
    }),
  });
}
