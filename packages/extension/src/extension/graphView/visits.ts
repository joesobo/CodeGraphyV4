import type { ExtensionToWebviewMessage } from '../../shared/types';
import {
  getGraphViewVisitCount,
  incrementGraphViewVisitCount,
} from '../graphViewVisits';

const VISITS_KEY = 'codegraphy.fileVisits';

interface GraphViewVisitsWorkspaceState {
  get<T>(key: string): T | undefined;
  update(key: string, value: unknown): PromiseLike<void>;
}

export function readPersistedGraphViewVisitCount(
  workspaceState: GraphViewVisitsWorkspaceState,
  filePath: string,
): number {
  const visits = workspaceState.get<Record<string, number>>(VISITS_KEY) ?? {};
  return getGraphViewVisitCount(visits, filePath);
}

export async function incrementPersistedGraphViewVisitCount(
  workspaceState: GraphViewVisitsWorkspaceState,
  filePath: string,
): Promise<Extract<ExtensionToWebviewMessage, { type: 'NODE_ACCESS_COUNT_UPDATED' }>> {
  const visits = workspaceState.get<Record<string, number>>(VISITS_KEY) ?? {};
  const nextVisitState = incrementGraphViewVisitCount(visits, filePath);
  await workspaceState.update(VISITS_KEY, nextVisitState.visits);

  return {
    type: 'NODE_ACCESS_COUNT_UPDATED',
    payload: { nodeId: filePath, accessCount: nextVisitState.accessCount },
  };
}
