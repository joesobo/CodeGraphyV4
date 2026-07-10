import type { GraphViewProviderWebviewMethodDependencies } from './defaultDependencies';
import { getGraphViewProviderSidebarViews, type GraphViewProviderSidebarViewSource } from './sidebarViews';

export interface GraphViewProviderWebviewMessageSource extends GraphViewProviderSidebarViewSource {
  _graphMessageRevision?: number;
  _panels: import('vscode').WebviewPanel[];
  _notifyExtensionMessage(message: unknown): void;
}

function correlateGraphDataMessage(
  source: GraphViewProviderWebviewMessageSource,
  message: unknown,
): unknown {
  if (
    !message
    || typeof message !== 'object'
    || (message as { type?: unknown }).type !== 'GRAPH_DATA_UPDATED'
  ) {
    return message;
  }

  const graphRevision = (source._graphMessageRevision ?? 0) + 1;
  source._graphMessageRevision = graphRevision;
  return { ...message, graphRevision };
}

export function sendGraphViewProviderWebviewMessage(
  source: GraphViewProviderWebviewMessageSource,
  dependencies: Pick<GraphViewProviderWebviewMethodDependencies, 'sendWebviewMessage'>,
  message: unknown,
): void {
  const sidebarViews = getGraphViewProviderSidebarViews(source);
  const correlatedMessage = correlateGraphDataMessage(source, message);
  dependencies.sendWebviewMessage(
    sidebarViews,
    source._panels,
    correlatedMessage,
  );
  source._notifyExtensionMessage(correlatedMessage);
}
