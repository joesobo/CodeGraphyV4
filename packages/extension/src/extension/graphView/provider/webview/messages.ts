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
  dependencies.sendWebviewMessage(
    getGraphViewProviderSidebarViews(source),
    source._panels,
    message,
  );
  source._notifyExtensionMessage(message);
}

