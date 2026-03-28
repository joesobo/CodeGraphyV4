import type { ICommitInfo } from '../../../shared/contracts';
import { CACHE_VERSION, CACHE_VERSION_KEY, COMMITS_STATE_KEY } from '../constants';

export interface CacheWorkspaceState {
  get<T>(key: string): T | undefined;
  update(key: string, value: unknown): Thenable<void>;
}

export async function persistCachedCommitState(
  workspaceState: CacheWorkspaceState,
  commits: ICommitInfo[]
): Promise<void> {
  await workspaceState.update(COMMITS_STATE_KEY, commits);
  await workspaceState.update(CACHE_VERSION_KEY, CACHE_VERSION);
}

export async function clearCachedCommitState(workspaceState: CacheWorkspaceState): Promise<void> {
  await workspaceState.update(COMMITS_STATE_KEY, undefined);
  await workspaceState.update(CACHE_VERSION_KEY, undefined);
}

export function hasCachedTimeline(workspaceState: CacheWorkspaceState): boolean {
  const version = workspaceState.get<string>(CACHE_VERSION_KEY);
  return version === CACHE_VERSION;
}

export function getCachedCommitList(
  workspaceState: CacheWorkspaceState
): ICommitInfo[] | null {
  if (!hasCachedTimeline(workspaceState)) {
    return null;
  }

  return workspaceState.get<ICommitInfo[]>(COMMITS_STATE_KEY) ?? null;
}
