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

export interface GraphViewProviderViewSelectionMethodsSource {
  _context: { workspaceState: unknown };
  _viewContext: IViewContext;
  _depthMode: boolean;
  _graphData: IGraphData;
  _applyViewTransform?(this: void): void;
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

  const changeView = async (viewId: string): Promise<void> => {
    await dependencies.changeView(source, viewId, {
      persistDepthMode: async nextDepthMode => {
        await dependencies
          .getConfiguration()
          .update(dependencies.depthModeKey ?? 'depthMode', nextDepthMode);
      },
      applyViewTransform: () => callApplyViewTransform(),
      sendMessage: message => source._sendMessage(message as ExtensionToWebviewMessage),
    });
  };

  const setFocusedFile = (filePath: string | undefined): void => {
    dependencies.setFocusedFile(source, filePath, {
      applyViewTransform: () => callApplyViewTransform(),
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
  };

  const setDepthLimit = async (depthLimit: number): Promise<void> => {
    await dependencies.setDepthLimit(source, depthLimit, {
      persistDepthLimit: async nextDepthLimit => {
        await dependencies.getConfiguration().update(dependencies.depthLimitKey, nextDepthLimit);
      },
      sendMessage: message => source._sendMessage(message as ExtensionToWebviewMessage),
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
