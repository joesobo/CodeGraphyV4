import type { IGraphData } from '../../../shared/contracts';
import {
  incrementPersistedGraphViewVisitCount,
  readPersistedGraphViewVisitCount,
} from './index';

interface GraphViewWorkspaceStateLike {
  get<T>(key: string): T | undefined;
  update(key: string, value: unknown): PromiseLike<void>;
}

interface IncrementGraphViewVisitCountOptions {
  workspaceState: GraphViewWorkspaceStateLike;
  sendMessage: (message: unknown) => void;
}

interface TrackGraphViewFileVisitOptions {
  graphData: IGraphData;
  incrementVisitCount: (filePath: string) => Promise<void>;
}

export function getGraphViewVisitCount(
  workspaceState: GraphViewWorkspaceStateLike,
  filePath: string,
): number {
  return readPersistedGraphViewVisitCount(workspaceState as never, filePath);
}

export async function incrementGraphViewVisitCount(
  filePath: string,
  { workspaceState, sendMessage }: IncrementGraphViewVisitCountOptions,
): Promise<void> {
  sendMessage(
    await incrementPersistedGraphViewVisitCount(workspaceState as never, filePath),
  );
}

export async function trackGraphViewFileVisit(
  filePath: string,
  { graphData, incrementVisitCount }: TrackGraphViewFileVisitOptions,
): Promise<void> {
  if (graphData.nodes.some(node => node.id === filePath)) {
    await incrementVisitCount(filePath);
  }
}
