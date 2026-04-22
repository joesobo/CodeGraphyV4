import * as path from 'node:path';
import type { TreeSitterPathHost } from '../pipeline/plugins/treesitter/runtime/pathHost';

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

function normalizeRelativePath(relativePath: string): string {
  return relativePath.split(path.sep).join('/');
}

function toRelativeFilePath(absolutePath: string, workspaceRoot: string): string | null {
  const relativePath = path.relative(workspaceRoot, absolutePath);
  if (relativePath === '') {
    return null;
  }

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }

  return normalizeRelativePath(relativePath);
}

function toRelativeDirectoryPath(absolutePath: string, workspaceRoot: string): string | null {
  const relativePath = path.relative(workspaceRoot, absolutePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }

  return relativePath === '' ? '' : normalizeRelativePath(relativePath);
}

function buildDirectoryEntries(
  allFiles: readonly string[],
): Map<string, string[]> {
  const directoryEntries = new Map<string, Set<string>>();

  const addEntry = (directoryPath: string, entryName: string) => {
    const entries = directoryEntries.get(directoryPath);
    if (entries) {
      entries.add(entryName);
      return;
    }

    directoryEntries.set(directoryPath, new Set([entryName]));
  };

  for (const relativeFilePath of allFiles) {
    const segments = normalizeRelativePath(relativeFilePath).split('/');
    let currentDirectory = '';

    for (let index = 0; index < segments.length; index += 1) {
      addEntry(currentDirectory, segments[index]);

      if (index === segments.length - 1) {
        break;
      }

      currentDirectory = currentDirectory
        ? `${currentDirectory}/${segments[index]}`
        : segments[index];
    }
  }

  return new Map(
    Array.from(directoryEntries.entries(), ([directoryPath, entries]) => {
      return [directoryPath, Array.from(entries).sort()];
    }),
  );
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
  const files = new Set(options.allFiles.map(normalizeRelativePath));
  const directories = buildDirectoryEntries(options.allFiles);
  const textFiles = await buildPrefetchedTextFiles(options);
  const isFile = (absolutePath: string): boolean => {
    const relativePath = toRelativeFilePath(absolutePath, options.workspaceRoot);
    return relativePath !== null && files.has(relativePath);
  };
  const isDirectory = (absolutePath: string): boolean => {
    const relativePath = toRelativeDirectoryPath(absolutePath, options.workspaceRoot);
    return relativePath !== null && directories.has(relativePath);
  };

  return {
    exists(absolutePath) {
      return isFile(absolutePath) || isDirectory(absolutePath);
    },
    isDirectory,
    isFile,
    listDirectory(absolutePath) {
      const relativePath = toRelativeDirectoryPath(absolutePath, options.workspaceRoot);
      return relativePath === null ? null : directories.get(relativePath) ?? null;
    },
    readTextFile(absolutePath) {
      return textFiles.get(absolutePath) ?? null;
    },
  };
}
