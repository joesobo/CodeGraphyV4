import type { ICommitInfo } from '../../../shared/timeline/contracts';
import {
  CACHE_VERSION,
  CACHE_VERSION_KEY,
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
): Promise<void> {
  await workspaceState.update(COMMITS_STATE_KEY, commits);
  await workspaceState.update(CACHE_VERSION_KEY, CACHE_VERSION);
  await workspaceState.update(PLUGIN_SIGNATURE_KEY, pluginSignature);
}

export async function clearCachedCommitState(workspaceState: CacheWorkspaceState): Promise<void> {
  await workspaceState.update(COMMITS_STATE_KEY, undefined);
  await workspaceState.update(CACHE_VERSION_KEY, undefined);
  await workspaceState.update(PLUGIN_SIGNATURE_KEY, undefined);
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
