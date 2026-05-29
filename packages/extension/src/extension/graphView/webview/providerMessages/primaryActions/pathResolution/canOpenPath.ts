import type { GraphViewProviderMessageListenerSource } from '../../listener';
import { canOpenGraphNode } from './nodeClassification';
import { isInferredFolderPath } from './inferredFolderPath';
import { resolveGraphOpenPath } from './openPath';

export function canOpenGraphPath(
  source: GraphViewProviderMessageListenerSource,
  filePath: string,
): boolean {
  const resolvedFilePath = resolveGraphOpenPath(source, filePath);
  if (resolvedFilePath !== filePath) {
    return canOpenGraphPath(source, resolvedFilePath);
  }

  const node = source._graphData.nodes.find((graphNode) => graphNode.id === filePath);
  if (node) {
    return canOpenGraphNode(node.nodeType);
  }

  return !filePath.startsWith('pkg:') && !isInferredFolderPath(source, filePath);
}
