import type { IGraphData } from '../shared/types';

interface IFileStatLike {
  size: number;
  mtime: number;
}

export interface IGraphViewFileInfoPayload {
  path: string;
  size: number;
  lastModified: number;
  incomingCount: number;
  outgoingCount: number;
  plugin: string | undefined;
  visits: number;
}

export function buildGraphViewFileInfoPayload(
  filePath: string,
  stat: IFileStatLike,
  graphData: IGraphData,
  plugin: string | undefined,
  visits: number
): IGraphViewFileInfoPayload {
  let incomingCount = 0;
  let outgoingCount = 0;

  for (const edge of graphData.edges) {
    if (edge.to === filePath) incomingCount++;
    if (edge.from === filePath) outgoingCount++;
  }

  return {
    path: filePath,
    size: stat.size,
    lastModified: stat.mtime,
    incomingCount,
    outgoingCount,
    plugin,
    visits,
  };
}
