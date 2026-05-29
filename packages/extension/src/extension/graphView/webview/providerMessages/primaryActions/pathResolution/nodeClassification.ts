import type { GraphViewProviderMessageListenerSource } from '../../listener';

type GraphNode = GraphViewProviderMessageListenerSource['_graphData']['nodes'][number];

export function canOpenGraphNode(nodeType: string | undefined): boolean {
  return nodeType !== 'folder' && nodeType !== 'package';
}

export function isGraphFileNode(graphNode: GraphNode): boolean {
  return graphNode.nodeType !== 'folder'
    && graphNode.nodeType !== 'package'
    && !graphNode.id.startsWith('pkg:');
}
