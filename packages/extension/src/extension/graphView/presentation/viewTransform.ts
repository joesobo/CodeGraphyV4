import type { IGraphData } from '../../../shared/graph/types';
import type { IViewContext } from '../../../core/views/contracts';
import type { ViewRegistry } from '../../../core/views/registry';
import { filterSyntheticPackageNodes } from './syntheticPackageNodes';
import type { IGraphViewTransformResult } from './types';

export function applyGraphViewTransform(
  viewRegistry: Pick<ViewRegistry, 'get' | 'isViewAvailable' | 'getDefaultViewId'>,
  viewContext: IViewContext,
  rawGraphData: IGraphData,
): IGraphViewTransformResult {
  void viewRegistry;
  void viewContext;
  const graphDataForActiveView = filterSyntheticPackageNodes(rawGraphData);
  return {
    graphData: graphDataForActiveView,
  };
}
