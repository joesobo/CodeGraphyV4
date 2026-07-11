import path from 'node:path';
import type { NativeGitStatus } from './model';

interface GitChangeLike {
  uri: { fsPath: string };
  status: number;
}

interface GitRepositoryLike {
  state: {
    mergeChanges: readonly GitChangeLike[];
    indexChanges: readonly GitChangeLike[];
    workingTreeChanges: readonly GitChangeLike[];
  };
}

interface GitApiLike {
  repositories: readonly GitRepositoryLike[];
}

interface GitExtensionExportsLike {
  getAPI(version: 1): GitApiLike;
}

interface GitExtensionLike {
  isActive: boolean;
  exports?: GitExtensionExportsLike;
  activate(): PromiseLike<GitExtensionExportsLike>;
}

export interface CollectGitStatusesDependencies {
  workspaceRoots: readonly string[];
  getGitExtension(): GitExtensionLike | undefined;
  execGitStatus(workspaceRoot: string): Promise<string>;
}

const STATUS_PRIORITY: Record<NativeGitStatus, number> = {
  untracked: 0,
  added: 1,
  renamed: 2,
  modified: 3,
  deleted: 4,
  conflict: 5,
};

export async function collectGitStatuses(
  dependencies: CollectGitStatusesDependencies,
): Promise<Map<string, NativeGitStatus>> {
  const apiStatuses = await collectFromGitApi(() => dependencies.getGitExtension());
  if (apiStatuses) return apiStatuses;

  const results = await Promise.all(dependencies.workspaceRoots.map(async workspaceRoot => {
    try {
      return parseGitPorcelain(await dependencies.execGitStatus(workspaceRoot), workspaceRoot);
    } catch {
      return new Map<string, NativeGitStatus>();
    }
  }));
  return mergeStatusMaps(results);
}

async function collectFromGitApi(
  getGitExtension: () => GitExtensionLike | undefined,
): Promise<Map<string, NativeGitStatus> | undefined> {
  const extension = getGitExtension();
  if (!extension) return undefined;

  try {
    const exports = extension.isActive && extension.exports
      ? extension.exports
      : await extension.activate();
    const api = exports.getAPI(1);
    if (api.repositories.length === 0) return undefined;

    const statuses = new Map<string, NativeGitStatus>();
    for (const repository of api.repositories) {
      for (const change of [
        ...repository.state.indexChanges,
        ...repository.state.workingTreeChanges,
        ...repository.state.mergeChanges,
      ]) {
        const status = mapGitApiStatus(change.status);
        if (status) setPreferredStatus(statuses, change.uri.fsPath, status);
      }
    }
    return statuses;
  } catch {
    return undefined;
  }
}

export function parseGitPorcelain(
  output: string,
  workspaceRoot: string,
): Map<string, NativeGitStatus> {
  const records = output.split('\0');
  const statuses = new Map<string, NativeGitStatus>();
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (record.length < 4) continue;
    const code = record.slice(0, 2);
    const status = mapPorcelainStatus(code);
    if (!status) continue;
    const relativePath = record.slice(3);
    setPreferredStatus(statuses, path.resolve(workspaceRoot, relativePath), status);
    if (code.includes('R') || code.includes('C')) index += 1;
  }
  return statuses;
}

function mapGitApiStatus(status: number): NativeGitStatus | undefined {
  if (status >= 12 && status <= 18) return 'conflict';
  if (status === 2 || status === 6) return 'deleted';
  if (status === 3 || status === 10) return 'renamed';
  if (status === 1 || status === 9) return 'added';
  if (status === 7) return 'untracked';
  if (status === 0 || status === 4 || status === 5 || status === 11) return 'modified';
  return undefined;
}

function mapPorcelainStatus(code: string): NativeGitStatus | undefined {
  if (['DD', 'AU', 'UD', 'UA', 'DU', 'AA', 'UU'].includes(code)) return 'conflict';
  if (code.includes('D')) return 'deleted';
  if (code.includes('R')) return 'renamed';
  if (code.includes('A')) return 'added';
  if (code.includes('?')) return 'untracked';
  if (code.includes('M') || code.includes('T') || code.includes('C')) return 'modified';
  return undefined;
}

function mergeStatusMaps(
  maps: readonly ReadonlyMap<string, NativeGitStatus>[],
): Map<string, NativeGitStatus> {
  const merged = new Map<string, NativeGitStatus>();
  for (const statuses of maps) {
    for (const [filePath, status] of statuses) setPreferredStatus(merged, filePath, status);
  }
  return merged;
}

function setPreferredStatus(
  statuses: Map<string, NativeGitStatus>,
  filePath: string,
  nextStatus: NativeGitStatus,
): void {
  const currentStatus = statuses.get(filePath);
  if (!currentStatus || STATUS_PRIORITY[nextStatus] > STATUS_PRIORITY[currentStatus]) {
    statuses.set(filePath, nextStatus);
  }
}
