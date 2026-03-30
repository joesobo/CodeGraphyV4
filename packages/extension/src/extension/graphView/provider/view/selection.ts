import type { IViewContext } from '../../../../core/views/contracts';
import type { IGraphData } from '../../../../shared/graph/types';
import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import {
  changeGraphViewView,
  getGraphViewDepthLimit,
  setGraphViewDepthLimit,
  setGraphViewFocusedFile,
} from '../../view/selection';

interface GraphViewProviderWorkspaceStateLike {
  update(key: string, value: unknown): PromiseLike<void>;
}

interface GraphViewProviderViewInfoLike {
  view: {
    id: string;
  };
}

export interface GraphViewProviderViewSelectionMethodsSource {
  _context: { workspaceState: GraphViewProviderWorkspaceStateLike };
  _viewRegistry: {
    get(viewId: string): GraphViewProviderViewInfoLike | undefined;
    isViewAvailable(viewId: string, viewContext: IViewContext): boolean;
  };
  _viewContext: IViewContext;
  _activeViewId: string;
  _graphData: IGraphData;
  _applyViewTransform?(this: void): void;
  _sendAvailableViews?(this: void): void;
  _sendMessage(message: ExtensionToWebviewMessage): void;
}

export interface GraphViewProviderViewSelectionMethods {
  changeView(viewId: string): Promise<void>;
  setFocusedFile(filePath: string | undefined): void;
  setDepthLimit(depthLimit: number): Promise<void>;
  getDepthLimit(): number;
}

export interface GraphViewProviderViewSelectionMethodDependencies {
  changeView: typeof changeGraphViewView;
  setFocusedFile: typeof setGraphViewFocusedFile;
  setDepthLimit: typeof setGraphViewDepthLimit;
  getDepthLimit: typeof getGraphViewDepthLimit;
  defaultDepthLimit: number;
  selectedViewKey: string;
  depthLimitKey: string;
  logUnavailableView(viewId: string): void;
}

function createDefaultGraphViewProviderViewSelectionMethodDependencies(): GraphViewProviderViewSelectionMethodDependencies {
  return {
    changeView: changeGraphViewView,
    setFocusedFile: setGraphViewFocusedFile,
    setDepthLimit: setGraphViewDepthLimit,
    getDepthLimit: getGraphViewDepthLimit,
    defaultDepthLimit: 1,
    selectedViewKey: 'codegraphy.selectedView',
    depthLimitKey: 'codegraphy.depthLimit',
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
      persistActiveViewId: async nextViewId => {
        await source._context.workspaceState.update(dependencies.selectedViewKey, nextViewId);
      },
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

  const setDepthLimit = async (depthLimit: number): Promise<void> => {
    await dependencies.setDepthLimit(source, depthLimit, {
      persistDepthLimit: async nextDepthLimit => {
        await source._context.workspaceState.update(dependencies.depthLimitKey, nextDepthLimit);
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
    setFocusedFile,
    setDepthLimit,
    getDepthLimit,
  };
}
