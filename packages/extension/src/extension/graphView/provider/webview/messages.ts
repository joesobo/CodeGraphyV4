import type { GraphViewProviderWebviewMethodDependencies } from './defaultDependencies';
import { getGraphViewProviderSidebarViews, type GraphViewProviderSidebarViewSource } from './sidebarViews';

export interface GraphViewProviderWebviewMessageSource extends GraphViewProviderSidebarViewSource {
  _panels: import('vscode').WebviewPanel[];
  _notifyExtensionMessage(message: unknown): void;
}

export function sendGraphViewProviderWebviewMessage(
  source: GraphViewProviderWebviewMessageSource,
  dependencies: Pick<GraphViewProviderWebviewMethodDependencies, 'sendWebviewMessage'>,
  message: unknown,
): void {
  const sidebarViews = getGraphViewProviderSidebarViews(source);
  dependencies.sendWebviewMessage(
    sidebarViews,
    source._panels,
    message,
  );
  source._notifyExtensionMessage(message);
}
