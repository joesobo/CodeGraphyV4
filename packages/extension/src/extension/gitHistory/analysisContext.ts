import * as path from 'node:path';
import type { IPluginAnalysisContext } from '../../core/plugins/types/contracts';
import {
  buildGitHistoryDirectoryEntries,
  normalizeGitHistoryPath,
  toRelativeGitHistoryDirectoryPath,
  toRelativeGitHistoryFilePath,
} from './pathIndex';

export interface CreateGitHistoryAnalysisContextOptions {
  allFiles: readonly string[];
  getFileAtCommit: (
    sha: string,
    filePath: string,
    signal: AbortSignal,
  ) => Promise<string>;
  sha: string;
  signal: AbortSignal;
  workspaceRoot: string;
}

export function createGitHistoryAnalysisContext(
  options: CreateGitHistoryAnalysisContextOptions,
): IPluginAnalysisContext {
  const files = new Set(options.allFiles.map(normalizeGitHistoryPath));
  const directories = buildGitHistoryDirectoryEntries(options.allFiles);
  const textFileCache = new Map<string, Promise<string | null>>();

  const isFile = (absolutePath: string): boolean => {
    const relativePath = toRelativeGitHistoryFilePath(absolutePath, options.workspaceRoot);
    return relativePath !== null && files.has(relativePath);
  };

  const isDirectory = (absolutePath: string): boolean => {
    const relativePath = toRelativeGitHistoryDirectoryPath(absolutePath, options.workspaceRoot);
    return relativePath !== null && directories.has(relativePath);
  };

  return {
    mode: 'timeline',
    commitSha: options.sha,
    fileSystem: {
      async exists(filePath) {
        return isFile(filePath) || isDirectory(filePath);
      },
      async isDirectory(filePath) {
        return isDirectory(filePath);
      },
      async isFile(filePath) {
        return isFile(filePath);
      },
      async listDirectory(filePath) {
        const relativePath = toRelativeGitHistoryDirectoryPath(filePath, options.workspaceRoot);
        return relativePath === null ? null : directories.get(relativePath) ?? null;
      },
      async readTextFile(filePath) {
        if (!isFile(filePath)) {
          return null;
        }

        const cached = textFileCache.get(filePath);
        if (cached) {
          return cached;
        }

        const relativePath = normalizeGitHistoryPath(
          path.relative(options.workspaceRoot, filePath),
        );
        const contentPromise = options.getFileAtCommit(
          options.sha,
          relativePath,
          options.signal,
        ).catch(() => null);
        textFileCache.set(filePath, contentPromise);
        return contentPromise;
      },
    },
  };
}
