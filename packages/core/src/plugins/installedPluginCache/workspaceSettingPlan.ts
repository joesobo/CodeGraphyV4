import type { IPluginUpdateImpact, IPluginUpdateImpactPolicy } from '@codegraphy-dev/plugin-api';
import type { CodeGraphyWorkspacePluginIndexingPlan } from './workspaceTogglePlan';

export type CodeGraphyWorkspacePluginSettingUpdateIndexingPlan =
  | { kind: 'settings-only' }
  | CodeGraphyWorkspacePluginIndexingPlan;

export interface CodeGraphyWorkspacePluginSettingUpdatePlanOptions {
  pluginId: string;
  settingKeys: readonly string[];
  updateImpact?: IPluginUpdateImpactPolicy;
}

const IMPACT_PRIORITY: Record<IPluginUpdateImpact, number> = {
  'settings-only': 0,
  'projection-only': 1,
  'reanalyze-plugin-files': 2,
  'requires-full-index': 3,
};

export function createCodeGraphyWorkspacePluginSettingUpdateIndexingPlan(
  options: CodeGraphyWorkspacePluginSettingUpdatePlanOptions,
): CodeGraphyWorkspacePluginSettingUpdateIndexingPlan {
  const impact = readHighestSettingImpact(options.updateImpact, options.settingKeys);
  if (impact === 'settings-only') {
    return { kind: 'settings-only' };
  }
  if (impact === 'projection-only') {
    return { kind: 'projection-only' };
  }
  if (impact === 'reanalyze-plugin-files') {
    return { kind: 'reprocess-plugin-files', pluginIds: [options.pluginId] };
  }
  return { kind: 'analyze-workspace' };
}

function readHighestSettingImpact(
  policy: IPluginUpdateImpactPolicy | undefined,
  settingKeys: readonly string[],
): IPluginUpdateImpact | undefined {
  const impacts: IPluginUpdateImpact[] = settingKeys.length === 0
    ? policy?.defaultSetting ? [policy.defaultSetting] : []
    : settingKeys.map(settingKey =>
        policy?.settings?.[settingKey] ?? policy?.defaultSetting ?? 'requires-full-index'
      );
  return impacts.reduce<IPluginUpdateImpact | undefined>((highest, impact) =>
    highest === undefined || IMPACT_PRIORITY[impact] > IMPACT_PRIORITY[highest]
      ? impact
      : highest
  , undefined);
}
