import type { IViewContext, ViewRegistry } from '../../core/views';
import type { ExtensionToWebviewMessage } from '../../shared/types';
import {
  changeGraphViewView,
  getGraphViewDepthLimit,
  setGraphViewDepthLimit,
  setGraphViewFocusedFile,
} from './viewSelection';

interface GraphViewProviderWorkspaceStateLike {
  update(key: string, value: unknown): PromiseLike<void>;
}

export interface GraphViewProviderViewSelectionMethodsSource {
  _context: { workspaceState: GraphViewProviderWorkspaceStateLike };
  _viewRegistry: Pick<ViewRegistry, 'get' | 'isViewAvailable'>;
  _viewContext: IViewContext;
  _activeViewId: string;
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

const DEFAULT_DEPENDENCIES: GraphViewProviderViewSelectionMethodDependencies = {
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

export function createGraphViewProviderViewSelectionMethods(
  source: GraphViewProviderViewSelectionMethodsSource,
  dependencies: GraphViewProviderViewSelectionMethodDependencies = DEFAULT_DEPENDENCIES,
): GraphViewProviderViewSelectionMethods {
  const callApplyViewTransform = (): void => {
    source._applyViewTransform?.();
  };

  const callSendAvailableViews = (): void => {
    source._sendAvailableViews?.();
  };

  const changeView = async (viewId: string): Promise<void> => {
    await dependencies.changeView(source as never, viewId, {
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
    dependencies.setFocusedFile(source as never, filePath, {
      getActiveViewInfo: nextViewId => source._viewRegistry.get(nextViewId) as never,
      applyViewTransform: () => callApplyViewTransform(),
      sendAvailableViews: () => callSendAvailableViews(),
      sendMessage: message => source._sendMessage(message as ExtensionToWebviewMessage),
    });
  };

  const setDepthLimit = async (depthLimit: number): Promise<void> => {
    await dependencies.setDepthLimit(source as never, depthLimit, {
      persistDepthLimit: async nextDepthLimit => {
        await source._context.workspaceState.update(dependencies.depthLimitKey, nextDepthLimit);
      },
      sendMessage: message => source._sendMessage(message as ExtensionToWebviewMessage),
      getActiveViewInfo: nextViewId => source._viewRegistry.get(nextViewId) as never,
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
