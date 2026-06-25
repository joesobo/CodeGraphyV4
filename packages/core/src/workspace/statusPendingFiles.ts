import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  DEFAULT_EXCLUDE,
  isDefaultExcludedPath,
  matchesAnyPattern,
} from '../discovery/pathMatching';

function normalizePendingPath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/\/+$/, '');
}

function resolvePendingPath(filePath: string, workspaceRoot: string | undefined): string {
  if (path.isAbsolute(filePath) || !workspaceRoot) {
    return filePath;
  }

  return path.join(workspaceRoot, filePath);
}

function parseIndexedAt(indexedAt: string | null | undefined): number | undefined {
  if (!indexedAt) {
    return undefined;
  }

  const parsed = Date.parse(indexedAt);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function wasPendingPathCoveredByIndex(
  filePath: string,
  options: {
    indexedAtMs: number | undefined;
    stat: (filePath: string) => fs.Stats;
    workspaceRoot: string | undefined;
  },
): boolean {
  if (options.indexedAtMs === undefined) {
    return false;
  }

  try {
    const stat = options.stat(resolvePendingPath(filePath, options.workspaceRoot));
    return stat.mtimeMs <= options.indexedAtMs;
  } catch {
    return false;
  }
}

export function filterWorkspaceStatusPendingChangedFiles(
  filePaths: readonly string[],
  options: {
    lastIndexedAt?: string | null;
    stat?: (filePath: string) => fs.Stats;
    workspaceRoot?: string;
  } = {},
): string[] {
  const normalizedWorkspaceRoot = options.workspaceRoot
    ? normalizePendingPath(options.workspaceRoot)
    : undefined;
  const indexedAtMs = parseIndexedAt(options.lastIndexedAt);
  const stat = options.stat ?? fs.statSync;

  return filePaths.filter((filePath) => {
    if (
      normalizedWorkspaceRoot
      && normalizePendingPath(filePath) === normalizedWorkspaceRoot
    ) {
      return false;
    }

    if (isDefaultExcludedPath(filePath) || matchesAnyPattern(filePath, DEFAULT_EXCLUDE)) {
      return false;
    }

    return !wasPendingPathCoveredByIndex(filePath, {
      indexedAtMs,
      stat,
      workspaceRoot: options.workspaceRoot,
    });
  });
}
