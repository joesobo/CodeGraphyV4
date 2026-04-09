import type { IViewContext } from '../../../../core/views/contracts';
import type { IGraphData } from '../../../../shared/graph/types';
import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import { getCodeGraphyConfiguration } from '../../../repoSettings/current';
import {
  changeGraphViewView,
  getGraphViewDepthLimit,
  setGraphViewDepthLimit,
  setGraphViewFocusedFile,
} from '../../view/selection';

interface GraphViewProviderConfigLike {
  update(key: string, value: unknown, target?: unknown): PromiseLike<void>;
}

interface GraphViewProviderViewInfoLike {
  view: {
    id: string;
  };
}

export interface GraphViewProviderViewSelectionMethodsSource {
  _context: { workspaceState: unknown };
  _viewRegistry: {
    get(viewId: string): GraphViewProviderViewInfoLike | undefined;
    isViewAvailable(viewId: string, viewContext: IViewContext): boolean;
  };
  _viewContext: IViewContext;
  _activeViewId: string;
  _depthMode: boolean;
  _graphData: IGraphData;
  _applyViewTransform?(this: void): void;
  _sendAvailableViews?(this: void): void;
  _sendMessage(message: ExtensionToWebviewMessage): void;
}

export interface GraphViewProviderViewSelectionMethods {
  changeView(viewId: string): Promise<void>;
  setDepthMode(depthMode: boolean): Promise<void>;
  setFocusedFile(filePath: string | undefined): void;
  setDepthLimit(depthLimit: number): Promise<void>;
  getDepthLimit(): number;
}

export interface GraphViewProviderViewSelectionMethodDependencies {
  getConfiguration(): GraphViewProviderConfigLike;
  changeView: typeof changeGraphViewView;
  setFocusedFile: typeof setGraphViewFocusedFile;
  setDepthLimit: typeof setGraphViewDepthLimit;
  getDepthLimit: typeof getGraphViewDepthLimit;
  defaultDepthLimit: number;
  depthModeKey?: string;
  depthLimitKey: string;
  logUnavailableView(viewId: string): void;
}

function createDefaultGraphViewProviderViewSelectionMethodDependencies(): GraphViewProviderViewSelectionMethodDependencies {
  return {
    changeView: changeGraphViewView,
    setFocusedFile: setGraphViewFocusedFile,
    setDepthLimit: setGraphViewDepthLimit,
    getDepthLimit: getGraphViewDepthLimit,
    getConfiguration: () => getCodeGraphyConfiguration(),
    defaultDepthLimit: 1,
    depthModeKey: 'depthMode',
    depthLimitKey: 'depthLimit',
    logUnavailableView: viewId => {
      console.warn(`[CodeGraphy] View '${viewId}' is not available`);
    },
  };
}

export function createGraphViewProviderViewSelectionMethods(
  source: GraphViewProviderViewSelectionMethodsSource,
  dependencies: GraphViewProviderViewSelectionMethodDependencies =
    createDefaultGraphViewProviderViewSelectionMethodDependencies(),
): GraphViewProviderViewSelectionMethods {
  const callApplyViewTransform = (): void => {
    source._applyViewTransform?.();
  };

  const callSendAvailableViews = (): void => {
    source._sendAvailableViews?.();
  };

  const changeView = async (viewId: string): Promise<void> => {
    await dependencies.changeView(source, viewId, {
      isViewAvailable: (nextViewId, viewContext) =>
        source._viewRegistry.isViewAvailable(nextViewId, viewContext),
      persistActiveViewId: async () => Promise.resolve(),
      applyViewTransform: () => callApplyViewTransform(),
      sendAvailableViews: () => callSendAvailableViews(),
      sendMessage: message => source._sendMessage(message as ExtensionToWebviewMessage),
      logUnavailableView: nextViewId => dependencies.logUnavailableView(nextViewId),
    });
  };

  const setFocusedFile = (filePath: string | undefined): void => {
    dependencies.setFocusedFile(source, filePath, {
      getActiveViewInfo: nextViewId => source._viewRegistry.get(nextViewId),
      applyViewTransform: () => callApplyViewTransform(),
      sendAvailableViews: () => callSendAvailableViews(),
      sendMessage: message => source._sendMessage(message as ExtensionToWebviewMessage),
    });
  };

  const setDepthMode = async (depthMode: boolean): Promise<void> => {
    source._depthMode = depthMode;
    await dependencies
      .getConfiguration()
      .update(dependencies.depthModeKey ?? 'depthMode', depthMode);
    callApplyViewTransform();
    source._sendMessage({
      type: 'DEPTH_MODE_UPDATED',
      payload: { depthMode: source._depthMode },
    });
    source._sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: source._graphData });
    callSendAvailableViews();
  };

  const setDepthLimit = async (depthLimit: number): Promise<void> => {
    await dependencies.setDepthLimit(source, depthLimit, {
      persistDepthLimit: async nextDepthLimit => {
        await dependencies.getConfiguration().update(dependencies.depthLimitKey, nextDepthLimit);
      },
      sendMessage: message => source._sendMessage(message as ExtensionToWebviewMessage),
      getActiveViewInfo: nextViewId => source._viewRegistry.get(nextViewId),
      applyViewTransform: () => callApplyViewTransform(),
    });
  };

  const getDepthLimit = (): number =>
    dependencies.getDepthLimit(source._viewContext, dependencies.defaultDepthLimit);

  return {
    changeView,
    setDepthMode,
    setFocusedFile,
    setDepthLimit,
    getDepthLimit,
  };
}
