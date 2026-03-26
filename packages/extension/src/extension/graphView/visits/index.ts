import type { ExtensionToWebviewMessage } from '../../../shared/contracts';
import {
  getGraphViewVisitCount,
  incrementGraphViewVisitCount,
} from './counts';

interface GraphViewVisitsWorkspaceState {
  get<T>(key: string): T | undefined;
  update(key: string, value: unknown): PromiseLike<void>;
}

export function getGraphViewVisitsStorageKey(): string {
  return 'codegraphy.fileVisits';
}

function readGraphViewVisitsState(
  workspaceState: GraphViewVisitsWorkspaceState,
): Record<string, number> {
  return workspaceState.get<Record<string, number>>(getGraphViewVisitsStorageKey()) ?? {};
}

export function readPersistedGraphViewVisitCount(
  workspaceState: GraphViewVisitsWorkspaceState,
  filePath: string,
): number {
  const visits = readGraphViewVisitsState(workspaceState);
  return getGraphViewVisitCount(visits, filePath);
}

export async function incrementPersistedGraphViewVisitCount(
  workspaceState: GraphViewVisitsWorkspaceState,
  filePath: string,
): Promise<Extract<ExtensionToWebviewMessage, { type: 'NODE_ACCESS_COUNT_UPDATED' }>> {
  const visits = readGraphViewVisitsState(workspaceState);
  const nextVisitState = incrementGraphViewVisitCount(visits, filePath);
  await workspaceState.update(getGraphViewVisitsStorageKey(), nextVisitState.visits);

  return {
    type: 'NODE_ACCESS_COUNT_UPDATED',
    payload: { nodeId: filePath, accessCount: nextVisitState.accessCount },
  };
}
