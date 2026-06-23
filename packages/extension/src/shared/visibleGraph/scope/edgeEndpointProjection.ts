import type { IGraphData } from '../../graph/contracts';

export function getVisibleEdgeEndpoint(
  nodeId: string,
  allNodeById: ReadonlyMap<string, IGraphData['nodes'][number]>,
  visibleNodeIds: ReadonlySet<string>,
): string | undefined {
  if (visibleNodeIds.has(nodeId)) {
    return nodeId;
  }

  const containingFilePath = allNodeById.get(nodeId)?.symbol?.filePath;
  return containingFilePath && visibleNodeIds.has(containingFilePath)
    ? containingFilePath
    : undefined;
}
