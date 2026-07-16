import type { IGraphNode } from '../../../../../../shared/graph/contracts';
import type { IGraphNodeMetricsUpdate } from '../../../../../../shared/protocol/extensionToWebview';
import { areNodesEqualIgnoringMetrics } from '../equality/node';

export function createNodeMap(nodes: readonly IGraphNode[]): Map<string, IGraphNode> {
  return new Map(nodes.map(node => [node.id, node]));
}

function haveGraphNodeMetricsChanged(currentNode: IGraphNode, nextNode: IGraphNode): boolean {
  return currentNode.fileSize !== nextNode.fileSize;
}

function createGraphNodeMetricsUpdate(nextNode: IGraphNode): IGraphNodeMetricsUpdate {
  return {
    id: nextNode.id,
    fileSize: nextNode.fileSize,
  };
}

export function collectMetricOnlyGraphUpdates(
  currentNodes: readonly IGraphNode[],
  nextNodesById: ReadonlyMap<string, IGraphNode>,
): IGraphNodeMetricsUpdate[] | undefined {
  const updates: IGraphNodeMetricsUpdate[] = [];

  for (const currentNode of currentNodes) {
    const nextNode = nextNodesById.get(currentNode.id);
    if (!nextNode || !areNodesEqualIgnoringMetrics(currentNode, nextNode)) {
      return undefined;
    }

    if (haveGraphNodeMetricsChanged(currentNode, nextNode)) {
      updates.push(createGraphNodeMetricsUpdate(nextNode));
    }
  }

  return updates.length > 0 ? updates : undefined;
}
