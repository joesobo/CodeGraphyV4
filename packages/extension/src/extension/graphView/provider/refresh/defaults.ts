import { getCodeGraphyConfiguration } from '../../../repoSettings/current';
import { rebuildGraphViewData, smartRebuildGraphView } from '../../view/rebuild';
import type { GraphViewProviderRefreshMethodDependencies } from './contracts';

export const DEFAULT_DEPENDENCIES: GraphViewProviderRefreshMethodDependencies = {
  getShowOrphans: () =>
    getCodeGraphyConfiguration().get<boolean>('showOrphans', true),
  rebuildGraphData: rebuildGraphViewData,
  smartRebuildGraphData: smartRebuildGraphView,
};
