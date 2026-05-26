import type { GraphViewProviderMessageListenerSource } from '../../listener';

export function resolveGraphOpenPath(
  source: GraphViewProviderMessageListenerSource,
  targetId: string,
): string {
  return source._graphData.nodes.find(graphNode => graphNode.id === targetId)?.symbol?.filePath
    ?? targetId;
}
