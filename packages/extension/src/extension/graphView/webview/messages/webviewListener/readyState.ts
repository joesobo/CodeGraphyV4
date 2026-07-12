import type { GraphViewReadyState } from '../webviewReady/contracts';
import type { GraphViewMessageListenerContext } from './contracts';

export function createReadyState(context: GraphViewMessageListenerContext): GraphViewReadyState {
  return {
    maxFiles: context.getMaxFiles(),
    verboseDiagnostics: context.getConfig('verboseDiagnostics', false),
    depthMode: context.getDepthMode?.() ?? false,
    dagMode: context.getDagMode(),
    nodeSizeMode: context.getNodeSizeMode(),
    focusedFile: context.getFocusedFile(),
    hasWorkspace: context.hasWorkspace(),
    firstAnalysis: context.isFirstAnalysis(),
    readyNotified: context.isWebviewReadyNotified(),
  };
}
