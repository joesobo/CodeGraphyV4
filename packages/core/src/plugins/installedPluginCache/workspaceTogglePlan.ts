import type { IPluginUpdateImpact, IPluginUpdateImpactPolicy } from '@codegraphy-dev/plugin-api';
import type { CodeGraphyWorkspacePluginSettings } from '../../workspace/settings';
import { updateCodeGraphyWorkspacePluginSelection } from './workspaceSelection';

export type CodeGraphyWorkspacePluginIndexingPlan =
  | { kind: 'projection-only' }
  | { kind: 'analyze-workspace' }
  | { kind: 'reprocess-plugin-files'; pluginIds: string[] };

export interface CodeGraphyWorkspacePluginToggleOptions {
  pluginId: string;
  enabled: boolean;
  defaultOptions?: Record<string, unknown>;
  updateImpact?: IPluginUpdateImpactPolicy;
}

export interface CodeGraphyWorkspacePluginTogglePlan {
  plugins: CodeGraphyWorkspacePluginSettings[];
  indexing: CodeGraphyWorkspacePluginIndexingPlan;
}

export function createCodeGraphyWorkspacePluginTogglePlan(
  plugins: readonly CodeGraphyWorkspacePluginSettings[],
  options: CodeGraphyWorkspacePluginToggleOptions,
): CodeGraphyWorkspacePluginTogglePlan {
  return {
    plugins: updateCodeGraphyWorkspacePluginSelection(plugins, {
      pluginId: options.pluginId,
      defaultOptions: options.defaultOptions,
      activation: options.enabled ? 'enabled' : 'disabled',
    }),
    indexing: createPluginToggleIndexingPlan(
      options.pluginId,
      options.enabled,
      options.updateImpact?.toggle,
    ),
  };
}

function createPluginToggleIndexingPlan(
  pluginId: string,
  enabled: boolean,
  impact: IPluginUpdateImpact | undefined,
): CodeGraphyWorkspacePluginIndexingPlan {
  if (!enabled || impact === 'settings-only' || impact === 'projection-only') {
    return { kind: 'projection-only' };
  }
  if (impact === 'reanalyze-plugin-files') {
    return { kind: 'reprocess-plugin-files', pluginIds: [pluginId] };
  }
  return { kind: 'analyze-workspace' };
}
