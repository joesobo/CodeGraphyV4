import type { Disposable } from '../../../disposable';
import type { EdgeDecoration, NodeDecoration } from '../../../decoration/manager';
import type { ApiContext } from './context';

type DecorationContext = Pick<ApiContext, 'decorationManager' | 'pluginId'>;

export function decoratePluginNode(
  context: DecorationContext,
  nodeId: string,
  decoration: NodeDecoration,
): Disposable {
  return context.decorationManager.decorateNode(context.pluginId, nodeId, decoration);
}

export function decoratePluginEdge(
  context: DecorationContext,
  edgeId: string,
  decoration: EdgeDecoration,
): Disposable {
  return context.decorationManager.decorateEdge(context.pluginId, edgeId, decoration);
}

export function clearPluginDecorations(context: DecorationContext): void {
  context.decorationManager.clearDecorations(context.pluginId);
}
