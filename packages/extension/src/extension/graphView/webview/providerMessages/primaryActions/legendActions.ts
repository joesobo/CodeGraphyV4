import {
  getCodeGraphyConfiguration,
  updateCodeGraphyConfigurationSilently,
} from '../../../../repoSettings/current';
import type { GraphViewProviderMessageListenerSource } from '../listener';
import type { GraphViewProviderPrimaryActions } from './types';

type LegendActions = Pick<
  GraphViewProviderPrimaryActions,
  | 'persistLegends'
  | 'persistDefaultLegendVisibility'
  | 'persistDefaultLegendVisibilityBatch'
  | 'persistLegendOrder'
  | 'recomputeGroups'
  | 'sendGroupsUpdated'
>;

export function createLegendActions(
  source: GraphViewProviderMessageListenerSource,
): LegendActions {
  return {
    persistLegends: async legends => {
      await updateCodeGraphyConfigurationSilently('legend', legends);
    },
    persistDefaultLegendVisibility: async (legendId, visible) => {
      const currentVisibility = readDefaultLegendVisibility();
      await updateCodeGraphyConfigurationSilently('legendVisibility', {
        ...currentVisibility,
        [legendId]: visible,
      });
    },
    persistDefaultLegendVisibilityBatch: async (legendVisibility) => {
      const currentVisibility = readDefaultLegendVisibility();
      await updateCodeGraphyConfigurationSilently('legendVisibility', {
        ...currentVisibility,
        ...legendVisibility,
      });
    },
    persistLegendOrder: async legendIds => {
      await updateCodeGraphyConfigurationSilently('legendOrder', legendIds);
    },
    recomputeGroups: () => source._computeMergedGroups(),
    sendGroupsUpdated: () => source._sendGroupsUpdated(),
  };
}

function readDefaultLegendVisibility(): Record<string, boolean> {
  return getCodeGraphyConfiguration().get<Record<string, boolean>>('legendVisibility', {}) ?? {};
}
