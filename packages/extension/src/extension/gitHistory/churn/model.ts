import type { IGraphData, IGraphNode } from '../../../shared/graph/contracts';
import { parseDiffLine } from '../diff/parse';

export type GitHistoryChurnCounts = Record<string, number>;

export function createInitialGitHistoryChurn(graphData: IGraphData): GitHistoryChurnCounts {
  const churnCounts: GitHistoryChurnCounts = {};

  for (const node of graphData.nodes) {
    if (isGraphableFileNode(node)) {
      churnCounts[node.id] = 1;
    }
  }

  return churnCounts;
}

export function updateGitHistoryChurnFromDiff(
  previousCounts: GitHistoryChurnCounts,
  diffOutput: string,
  graphData: IGraphData,
): GitHistoryChurnCounts {
  const graphableFileIds = getGraphableFileIds(graphData);
  const nextCounts = keepCurrentGraphableCounts(previousCounts, graphableFileIds);
  const touchedFileIds = new Set<string>();

  for (const line of diffOutput.trim().split('\n').filter(Boolean)) {
    const diffLine = parseDiffLine(line);

    switch (diffLine.kind) {
      case 'add':
      case 'modify':
        incrementTouchedFile(diffLine.filePath, nextCounts, graphableFileIds, touchedFileIds);
        break;
      case 'rename':
        renameTouchedFile(
          diffLine.oldPath,
          diffLine.newPath,
          previousCounts,
          nextCounts,
          graphableFileIds,
          touchedFileIds,
        );
        break;
      case 'delete':
        delete nextCounts[diffLine.filePath];
        break;
      case 'ignore':
        break;
    }
  }

  return keepCurrentGraphableCounts(nextCounts, graphableFileIds);
}

export function applyGitHistoryChurnToGraphData(
  graphData: IGraphData,
  churnCounts: GitHistoryChurnCounts,
): IGraphData {
  return {
    ...graphData,
    nodes: graphData.nodes.map((node) => {
      if (!isGraphableFileNode(node)) {
        return node;
      }

      return {
        ...node,
        churn: churnCounts[node.id] ?? 0,
      };
    }),
  };
}

function renameTouchedFile(
  oldPath: string,
  newPath: string,
  previousCounts: GitHistoryChurnCounts,
  nextCounts: GitHistoryChurnCounts,
  graphableFileIds: Set<string>,
  touchedFileIds: Set<string>,
): void {
  const previousCount = previousCounts[oldPath] ?? previousCounts[newPath] ?? 0;
  delete nextCounts[oldPath];

  incrementTouchedFile(
    newPath,
    nextCounts,
    graphableFileIds,
    touchedFileIds,
    previousCount,
  );
}

function incrementTouchedFile(
  filePath: string,
  nextCounts: GitHistoryChurnCounts,
  graphableFileIds: Set<string>,
  touchedFileIds: Set<string>,
  baseCount = nextCounts[filePath] ?? 0,
): void {
  if (!graphableFileIds.has(filePath) || touchedFileIds.has(filePath)) {
    return;
  }

  touchedFileIds.add(filePath);
  nextCounts[filePath] = baseCount + 1;
}

function keepCurrentGraphableCounts(
  counts: GitHistoryChurnCounts,
  graphableFileIds: Set<string>,
): GitHistoryChurnCounts {
  const currentCounts: GitHistoryChurnCounts = {};

  for (const fileId of graphableFileIds) {
    if (counts[fileId] !== undefined) {
      currentCounts[fileId] = counts[fileId];
    }
  }

  return currentCounts;
}

function getGraphableFileIds(graphData: IGraphData): Set<string> {
  return new Set(
    graphData.nodes
      .filter(isGraphableFileNode)
      .map((node) => node.id),
  );
}

function isGraphableFileNode(node: IGraphNode): boolean {
  return node.nodeType === undefined || node.nodeType === 'file';
}
