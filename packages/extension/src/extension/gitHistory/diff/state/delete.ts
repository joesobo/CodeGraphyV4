import type { IGraphEdge, IGraphNode } from '../../../../shared/graph/contracts';

export function deleteGitHistoryGraphFile(
  filePath: string,
  nodes: IGraphNode[],
  edges: IGraphEdge[],
  nodeMap: Map<string, IGraphNode>,
  edgeSet: Set<string>,
): void {
  const nodeIndex = nodes.findIndex((node) => node.id === filePath);
  if (nodeIndex !== -1) {
    nodes.splice(nodeIndex, 1);
  }

  nodeMap.delete(filePath);

  const edgeIndexesToRemove: number[] = [];
  for (let index = edges.length - 1; index >= 0; index--) {
    if (edges[index].from !== filePath && edges[index].to !== filePath) {
      continue;
    }

    edgeSet.delete(edges[index].id);
    edgeIndexesToRemove.push(index);
  }

  for (const index of edgeIndexesToRemove) {
    edges.splice(index, 1);
  }
}
