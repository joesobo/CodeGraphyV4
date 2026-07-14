import type { IGraphData, IGraphNode } from '../../../../../../shared/graph/contracts';

function normalizeGraphPath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function isGraphNodeForChangedPath(nodeId: string, changedFilePath: string): boolean {
  const normalizedNodeId = normalizeGraphPath(nodeId);
  const normalizedChangedFilePath = normalizeGraphPath(changedFilePath);
  return normalizedChangedFilePath === normalizedNodeId
    || normalizedChangedFilePath.endsWith(`/${normalizedNodeId}`);
}

function isGraphNodeAffectedByChangedPath(node: IGraphNode, changedFilePath: string): boolean {
  const symbolFilePath = node.symbol?.filePath;
  return isGraphNodeForChangedPath(node.id, changedFilePath)
    || (symbolFilePath ? isGraphNodeForChangedPath(symbolFilePath, changedFilePath) : false);
}

function findGraphNodeByChangedPath(
  graphData: IGraphData,
  changedFilePath: string,
): IGraphNode | undefined {
  return graphData.nodes.find(node => isGraphNodeForChangedPath(node.id, changedFilePath));
}

export function hasChangedNodeMetricDifference(
  currentRawGraphData: IGraphData,
  nextRawGraphData: IGraphData,
  changedFilePaths: readonly string[] | undefined,
): boolean {
  if (!changedFilePaths?.length) {
    return false;
  }

  for (const changedFilePath of changedFilePaths) {
    const currentNode = findGraphNodeByChangedPath(currentRawGraphData, changedFilePath);
    const nextNode = findGraphNodeByChangedPath(nextRawGraphData, changedFilePath);
    if (!currentNode || !nextNode) {
      continue;
    }

    if (currentNode.fileSize !== nextNode.fileSize) {
      return true;
    }
  }

  return false;
}

export function collectChangedPathNodes(
  graphData: IGraphData,
  changedFilePaths: readonly string[],
): IGraphNode[] {
  return graphData.nodes.filter(node =>
    changedFilePaths.some(changedFilePath =>
      isGraphNodeAffectedByChangedPath(node, changedFilePath),
    ),
  );
}
