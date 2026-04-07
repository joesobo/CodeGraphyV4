import type { IGraphData } from '../../../shared/graph/types';
import type { IViewContext } from '../../../core/views/contracts';
import type { ViewRegistry } from '../../../core/views/registry';
import { filterSyntheticPackageNodes } from './syntheticPackageNodes';
import type { IGraphViewTransformResult } from './types';

export function applyGraphViewTransform(
  viewRegistry: Pick<ViewRegistry, 'get' | 'isViewAvailable' | 'getDefaultViewId'>,
  activeViewId: string,
  viewContext: IViewContext,
  rawGraphData: IGraphData,
): IGraphViewTransformResult {
  const graphDataForActiveView = filterSyntheticPackageNodes(rawGraphData, activeViewId);
  const viewInfo = viewRegistry.get(activeViewId);

  if (!viewInfo || !viewRegistry.isViewAvailable(activeViewId, viewContext)) {
    const defaultId = viewRegistry.getDefaultViewId();
    if (defaultId && defaultId !== activeViewId) {
      const defaultView = viewRegistry.get(defaultId);
      if (defaultView) {
        const graphDataForDefaultView = filterSyntheticPackageNodes(rawGraphData, defaultId);
        return {
          activeViewId: defaultId,
          graphData: defaultView.view.transform(graphDataForDefaultView, viewContext),
          persistSelectedViewId: defaultId,
        };
      }
    }

    return {
      activeViewId,
      graphData: graphDataForActiveView,
    };
  }

  return {
    activeViewId,
    graphData: viewInfo.view.transform(graphDataForActiveView, viewContext),
  };
}
