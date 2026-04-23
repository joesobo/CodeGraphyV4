import * as path from 'node:path';
import type { TreeSitterPathHost } from '../pipeline/plugins/treesitter/runtime/pathHost';
import {
  buildGitHistoryDirectoryEntries,
  normalizeGitHistoryPath,
  toRelativeGitHistoryDirectoryPath,
  toRelativeGitHistoryFilePath,
} from './pathIndex';

export interface CreateGitHistoryCommitPathHostOptions {
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

async function buildPrefetchedTextFiles(
  options: CreateGitHistoryCommitPathHostOptions,
): Promise<Map<string, string>> {
  const textFiles = new Map<string, string>();
  const candidateFiles = options.allFiles.filter((filePath) => path.basename(filePath) === 'go.mod');

  for (const relativeFilePath of candidateFiles) {
    const absolutePath = path.join(options.workspaceRoot, relativeFilePath);
    textFiles.set(
      absolutePath,
      await options.getFileAtCommit(options.sha, relativeFilePath, options.signal),
    );
  }

  return textFiles;
}

export async function createGitHistoryCommitPathHost(
  options: CreateGitHistoryCommitPathHostOptions,
): Promise<TreeSitterPathHost> {
  const files = new Set(options.allFiles.map(normalizeGitHistoryPath));
  const directories = buildGitHistoryDirectoryEntries(options.allFiles);
  const textFiles = await buildPrefetchedTextFiles(options);
  const isFile = (absolutePath: string): boolean => {
    const relativePath = toRelativeGitHistoryFilePath(absolutePath, options.workspaceRoot);
    return relativePath !== null && files.has(relativePath);
  };
  const isDirectory = (absolutePath: string): boolean => {
    const relativePath = toRelativeGitHistoryDirectoryPath(absolutePath, options.workspaceRoot);
    return relativePath !== null && directories.has(relativePath);
  };

  return {
    exists(absolutePath) {
      return isFile(absolutePath) || isDirectory(absolutePath);
    },
    isDirectory,
    isFile,
    listDirectory(absolutePath) {
      const relativePath = toRelativeGitHistoryDirectoryPath(absolutePath, options.workspaceRoot);
      return relativePath === null ? null : directories.get(relativePath) ?? null;
    },
    readTextFile(absolutePath) {
      return textFiles.get(absolutePath) ?? null;
    },
  };
}
