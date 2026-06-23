import type { GraphViewProviderWebviewMethodDependencies } from './defaultDependencies';
import { getGraphViewProviderSidebarViews, type GraphViewProviderSidebarViewSource } from './sidebarViews';

export interface GraphViewProviderWebviewMessageSource extends GraphViewProviderSidebarViewSource {
  _panels: import('vscode').WebviewPanel[];
  _notifyExtensionMessage(message: unknown): void;
}

export function sendGraphViewProviderWebviewMessage(
  source: GraphViewProviderWebviewMessageSource,
  dependencies: Pick<GraphViewProviderWebviewMethodDependencies, 'recordPerformanceEvent' | 'sendWebviewMessage'>,
  message: unknown,
): void {
  const sidebarViews = getGraphViewProviderSidebarViews(source);
  dependencies.recordPerformanceEvent?.('graphWebview.message.send', {
    panelCount: source._panels.length,
    sidebarViewCount: sidebarViews.length,
    type: getGraphViewProviderWebviewMessageType(message),
  });
  dependencies.sendWebviewMessage(
    sidebarViews,
    source._panels,
    message,
  );
  source._notifyExtensionMessage(message);
}

function getGraphViewProviderWebviewMessageType(message: unknown): string | undefined {
  if (!message || typeof message !== 'object') {
    return undefined;
  }

  const type = (message as { type?: unknown }).type;
  return typeof type === 'string' ? type : undefined;
}
