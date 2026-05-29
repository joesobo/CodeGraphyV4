import type { GraphViewProviderMessageListenerSource } from '../../listener';
import { isGraphFileNode } from './nodeClassification';

type GraphNode = GraphViewProviderMessageListenerSource['_graphData']['nodes'][number];

export function isInferredFolderPath(
  source: GraphViewProviderMessageListenerSource,
  filePath: string,
): boolean {
  return filePath === '(root)'
    ? source._graphData.nodes.some(isRootLevelFileNode)
    : source._graphData.nodes.some((graphNode) => isNestedFileNode(graphNode, filePath));
}

function isRootLevelFileNode(graphNode: GraphNode): boolean {
  return isGraphFileNode(graphNode) && !graphNode.id.includes('/');
}

function isNestedFileNode(
  graphNode: GraphNode,
  filePath: string,
): boolean {
  return isGraphFileNode(graphNode) && graphNode.id.startsWith(`${filePath}/`);
}
