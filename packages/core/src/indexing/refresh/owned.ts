import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { IPluginNodeType } from '@codegraphy-dev/plugin-api';
import {
  createWorkspaceFileContentHash,
  type IWorkspaceAnalysisCache,
} from '../../analysis/cache';
import type { IGraphData } from '../../graph/contracts';
import {
  getWorkspaceAnalysisDatabasePath,
  withWorkspaceAnalysisDatabaseWriter,
} from '../../graphCache/database/storage';
import { readWorkspaceCacheWriteRevisionAsync } from '../../graphCache/database/writeCoordination/model';
import type { WorkspaceIndexCachePatch } from './contracts';

const DEFAULT_MAX_REFRESH_ATTEMPTS = 3;

export interface WorkspaceIndexOwnedRefreshAttempt<TResult> {
  cache: IWorkspaceAnalysisCache;
  completeGraph: IGraphData;
  nodeTypes?: readonly IPluginNodeType[];
  patch: WorkspaceIndexCachePatch;
  persistIndexMetadata(): Promise<void>;
  result: TResult;
  rollback(): void;
}

export interface WorkspaceIndexOwnedRefreshOptions<TResult> {
  maxAttempts?: number;
  prepare(): Promise<WorkspaceIndexOwnedRefreshAttempt<TResult>>;
  rebase?(): Promise<void>;
  workspaceRoot: string;
}

export class WorkspaceIndexRefreshSupersededError extends Error {
  readonly name = 'WorkspaceIndexRefreshSupersededError';

  constructor(readonly attempts: number) {
    super('Workspace files kept changing while targeted Indexing was preparing to persist.');
  }
}

export async function runOwnedWorkspaceIndexRefresh<TResult>(
  options: WorkspaceIndexOwnedRefreshOptions<TResult>,
): Promise<TResult> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_REFRESH_ATTEMPTS;

  const databasePath = getWorkspaceAnalysisDatabasePath(options.workspaceRoot);
  for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber += 1) {
    const analyzedRevision = await readWorkspaceCacheWriteRevisionAsync(databasePath);
    const attempt = await options.prepare();
    try {
      const commit = await withWorkspaceAnalysisDatabaseWriter(
        options.workspaceRoot,
        async writer => {
          if (
            writer.revision !== analyzedRevision
            || !await isWorkspaceIndexRefreshAttemptCurrent(options.workspaceRoot, attempt)
          ) {
            return { committed: false } as const;
          }

          const upsertFiles: IWorkspaceAnalysisCache['files'] = {};
          for (const filePath of attempt.patch.upsertFilePaths) {
            const entry = attempt.cache.files[filePath];
            if (entry) upsertFiles[filePath] = entry;
          }
          const recovery = {
            cache: attempt.cache,
            graph: attempt.completeGraph,
            ...(attempt.nodeTypes ? { nodeTypes: attempt.nodeTypes } : {}),
          };
          writer.patch({
            deleteFilePaths: attempt.patch.deleteFilePaths,
            ...(attempt.patch.deleteNodeIds
              ? { deleteNodeIds: attempt.patch.deleteNodeIds }
              : {}),
            upsertFiles,
            ...(attempt.patch.upsertNodeIds
              ? { upsertNodeIds: attempt.patch.upsertNodeIds }
              : {}),
            graph: attempt.completeGraph,
            ...(attempt.nodeTypes ? { nodeTypes: attempt.nodeTypes } : {}),
          }, recovery);
          await attempt.persistIndexMetadata();
          return { committed: true, result: attempt.result } as const;
        },
      );

      if (commit.committed) return commit.result;
    } catch (error) {
      attempt.rollback();
      throw error;
    }

    attempt.rollback();
    if (attemptNumber < maxAttempts) await options.rebase?.();
  }

  throw new WorkspaceIndexRefreshSupersededError(maxAttempts);
}

async function isWorkspaceIndexRefreshAttemptCurrent<TResult>(
  workspaceRoot: string,
  attempt: WorkspaceIndexOwnedRefreshAttempt<TResult>,
): Promise<boolean> {
  for (const filePath of attempt.patch.upsertFilePaths) {
    const entry = attempt.cache.files[filePath];
    if (!entry?.contentHash) return false;
    const absolutePath = resolveWorkspaceRefreshPath(workspaceRoot, filePath);
    if (!absolutePath) return false;
    try {
      const [content, fileStat] = await Promise.all([
        readFile(absolutePath, 'utf8'),
        stat(absolutePath),
      ]);
      if (!fileStat.isFile()) return false;
      if (entry.size !== undefined && entry.size !== fileStat.size) return false;
      if (entry.contentHash !== createWorkspaceFileContentHash(content)) return false;
    } catch (error) {
      if (isMissingPathError(error)) return false;
      throw error;
    }
  }

  for (const filePath of attempt.patch.deleteFilePaths) {
    if (await workspaceRefreshPathExists(workspaceRoot, filePath)) return false;
  }
  for (const nodeId of attempt.patch.upsertNodeIds ?? []) {
    if (!await workspaceRefreshDirectoryExists(workspaceRoot, nodeId)) return false;
  }
  for (const nodeId of attempt.patch.deleteNodeIds ?? []) {
    if (await workspaceRefreshPathExists(workspaceRoot, nodeId)) return false;
  }

  return true;
}

function resolveWorkspaceRefreshPath(workspaceRoot: string, relativePath: string): string | undefined {
  const absolutePath = path.resolve(workspaceRoot, relativePath);
  const relative = path.relative(workspaceRoot, absolutePath);
  return relative && !relative.startsWith(`..${path.sep}`) && relative !== '..'
    ? absolutePath
    : undefined;
}

async function workspaceRefreshPathExists(
  workspaceRoot: string,
  relativePath: string,
): Promise<boolean> {
  const absolutePath = resolveWorkspaceRefreshPath(workspaceRoot, relativePath);
  if (!absolutePath) return true;
  try {
    await stat(absolutePath);
    return true;
  } catch (error) {
    if (isMissingPathError(error)) return false;
    throw error;
  }
}

async function workspaceRefreshDirectoryExists(
  workspaceRoot: string,
  relativePath: string,
): Promise<boolean> {
  const absolutePath = resolveWorkspaceRefreshPath(workspaceRoot, relativePath);
  if (!absolutePath) return false;
  try {
    return (await stat(absolutePath)).isDirectory();
  } catch (error) {
    if (isMissingPathError(error)) return false;
    throw error;
  }
}

function isMissingPathError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT');
}
