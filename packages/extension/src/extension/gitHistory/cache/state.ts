import type { ICommitInfo } from '../../../shared/timeline/contracts';
import type { GitHistoryChurnCounts } from '../churn/model';
import {
  CACHE_VERSION,
  CACHE_VERSION_KEY,
  CHURN_COUNTS_STATE_KEY,
  COMMITS_STATE_KEY,
  PLUGIN_SIGNATURE_KEY,
} from './stateKeys';

export interface CacheWorkspaceState {
  get<T>(key: string): T | undefined;
  update(key: string, value: unknown): Thenable<void>;
}

export async function persistCachedCommitState(
  workspaceState: CacheWorkspaceState,
  commits: ICommitInfo[],
  pluginSignature: string,
  churnCounts: GitHistoryChurnCounts,
): Promise<void> {
  await workspaceState.update(COMMITS_STATE_KEY, commits);
  await workspaceState.update(CACHE_VERSION_KEY, CACHE_VERSION);
  await workspaceState.update(PLUGIN_SIGNATURE_KEY, pluginSignature);
  await workspaceState.update(CHURN_COUNTS_STATE_KEY, churnCounts);
}

export async function clearCachedCommitState(workspaceState: CacheWorkspaceState): Promise<void> {
  await workspaceState.update(COMMITS_STATE_KEY, undefined);
  await workspaceState.update(CACHE_VERSION_KEY, undefined);
  await workspaceState.update(PLUGIN_SIGNATURE_KEY, undefined);
  await workspaceState.update(CHURN_COUNTS_STATE_KEY, undefined);
}

export function hasCachedTimeline(
  workspaceState: CacheWorkspaceState,
  pluginSignature: string,
): boolean {
  const version = workspaceState.get<string>(CACHE_VERSION_KEY);
  const cachedPluginSignature = workspaceState.get<string>(PLUGIN_SIGNATURE_KEY);
  return version === CACHE_VERSION && cachedPluginSignature === pluginSignature;
}

export function getCachedCommitList(
  workspaceState: CacheWorkspaceState,
  pluginSignature: string,
): ICommitInfo[] | null {
  if (!hasCachedTimeline(workspaceState, pluginSignature)) {
    return null;
  }

  return workspaceState.get<ICommitInfo[]>(COMMITS_STATE_KEY) ?? null;
}

export function getCachedGitHistoryChurnCounts(
  workspaceState: CacheWorkspaceState,
  pluginSignature: string,
): GitHistoryChurnCounts | null {
  if (!hasCachedTimeline(workspaceState, pluginSignature)) {
    return null;
  }

  return workspaceState.get<GitHistoryChurnCounts>(CHURN_COUNTS_STATE_KEY) ?? null;
}
