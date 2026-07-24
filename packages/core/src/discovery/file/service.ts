/**
 * @fileoverview File discovery system for finding source files in a workspace.
 * @module core/discovery/file/service
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { IDiscoveryOptions, IDiscoveredFile, IDiscoveryResult } from '../contracts';
import { throwIfAborted } from '../abort';
import { DEFAULT_EXCLUDE, matchesAnyPattern } from '../pathMatching';
import { shouldIncludeFile } from './filter';
import { walkDirectory } from './walk';
import { DEFAULT_INCLUDE, EMPTY_PATTERNS, DEFAULT_MAX_FILES } from './defaults';

function getDiscoveryConfig(options: IDiscoveryOptions) {
  return {
    maxFiles: options.maxFiles ?? DEFAULT_MAX_FILES,
    includePatterns: options.include ?? DEFAULT_INCLUDE,
    excludePatterns: options.exclude ?? EMPTY_PATTERNS,
    filterPatterns: options.filter ?? EMPTY_PATTERNS,
    respectGitignore: options.respectGitignore ?? true,
    extensions: options.extensions ?? EMPTY_PATTERNS,
  };
}

function createDiscoveredFile(
  relativePath: string,
  absolutePath: string,
  gitIgnored: boolean,
): IDiscoveredFile {
  return {
    relativePath,
    absolutePath,
    extension: path.extname(absolutePath).toLowerCase(),
    name: path.basename(absolutePath),
    ...(gitIgnored ? { gitIgnored: true } : {}),
  };
}

function toGitPath(relativePath: string): string {
  return relativePath.split(path.sep).join('/');
}

function collectGitIgnoredPathsFromGit(
  rootPath: string,
  relativePaths: readonly string[],
): Set<string> | undefined {
  if (relativePaths.length === 0) {
    return new Set();
  }

  const pathsByGitPath = new Map<string, string>();
  for (const relativePath of relativePaths) {
    pathsByGitPath.set(toGitPath(relativePath), relativePath);
  }

  const result = spawnSync(
    'git',
    ['-C', rootPath, 'check-ignore', '--stdin'],
    {
      encoding: 'utf8',
      input: `${[...pathsByGitPath.keys()].join('\n')}\n`,
    },
  );

  if (result.error || (result.status !== 0 && result.status !== 1)) {
    return undefined;
  }

  return new Set(
    result.stdout
      .split(/\r?\n/)
      .filter(Boolean)
      .map(gitPath => pathsByGitPath.get(gitPath) ?? gitPath),
  );
}

function collectGitIgnoredPaths(
  rootPath: string,
  filePaths: readonly string[],
  directoryPaths: readonly string[],
): Set<string> {
  return collectGitIgnoredPathsFromGit(
    rootPath,
    [...directoryPaths, ...filePaths],
  ) ?? new Set();
}

function collectContainingDirectories(filePaths: readonly string[]): Set<string> {
  const directories = new Set<string>();
  for (const filePath of filePaths) {
    let directoryPath = path.dirname(filePath);
    while (directoryPath !== '.') {
      directories.add(directoryPath);
      directoryPath = path.dirname(directoryPath);
    }
  }
  return directories;
}

function filterEligibleDirectories(
  directories: readonly string[],
  candidateFilePaths: readonly string[],
  eligibleFilePaths: readonly string[],
  filterPatterns: readonly string[],
  gitIgnoredPaths: ReadonlySet<string>,
): string[] {
  const directoriesWithCandidates = collectContainingDirectories(candidateFilePaths);
  const directoriesWithEligibleFiles = collectContainingDirectories(eligibleFilePaths);
  return directories.filter(directoryPath => (
    !matchesAnyPattern(directoryPath, filterPatterns)
    && !gitIgnoredPaths.has(directoryPath)
    && (
      !directoriesWithCandidates.has(directoryPath)
      || directoriesWithEligibleFiles.has(directoryPath)
    )
  ));
}

export class FileDiscovery {
  async discover(options: IDiscoveryOptions): Promise<IDiscoveryResult> {
    const startTime = Date.now();
    const { rootPath, signal } = options;
    const {
      maxFiles,
      includePatterns,
      excludePatterns,
      filterPatterns,
      respectGitignore,
      extensions,
    } = getDiscoveryConfig(options);

    throwIfAborted(signal);

    const allExclude = [...DEFAULT_EXCLUDE, ...excludePatterns];
    const candidateFiles: Array<{ absolutePath: string; relativePath: string }> = [];
    const directories: string[] = [];

    await walkDirectory(
      rootPath,
      rootPath,
      (relativePath, absolutePath) => {
        throwIfAborted(signal);

        if (shouldIncludeFile(relativePath, absolutePath, {
          includePatterns,
          excludePatterns: allExclude,
          extensions,
          gitignore: null,
        })) {
          candidateFiles.push({ absolutePath, relativePath });
        }
        return true;
      },
      relativePath => {
        directories.push(relativePath);
      },
      signal,
    );

    const gitIgnoredPaths = respectGitignore
      ? collectGitIgnoredPaths(
        rootPath,
        candidateFiles.map(file => file.relativePath),
        directories,
      )
      : new Set<string>();
    const eligibleFiles = candidateFiles.filter(file => (
      !matchesAnyPattern(file.relativePath, filterPatterns)
      && !gitIgnoredPaths.has(file.relativePath)
    ));
    const limitReached = eligibleFiles.length > maxFiles;
    const indexedFiles = eligibleFiles.slice(0, maxFiles);
    const indexedFilePaths = new Set(indexedFiles.map(file => file.relativePath));
    const eligibleFilePaths = new Set(eligibleFiles.map(file => file.relativePath));
    const cacheFilePaths = candidateFiles
      .filter(file => (
        !eligibleFilePaths.has(file.relativePath)
        || indexedFilePaths.has(file.relativePath)
      ))
      .map(file => file.relativePath);
    const files = indexedFiles
      .map(file => createDiscoveredFile(file.relativePath, file.absolutePath, false));
    const eligibleDirectories = filterEligibleDirectories(
      directories,
      candidateFiles.map(file => file.relativePath),
      files.map(file => file.relativePath),
      filterPatterns,
      gitIgnoredPaths,
    );

    const durationMs = Date.now() - startTime;
    return {
      files,
      cacheFilePaths,
      directories: eligibleDirectories,
      gitIgnoredPaths: [...gitIgnoredPaths],
      limitReached,
      totalFound: limitReached ? eligibleFiles.length : undefined,
      durationMs,
    };
  }

  async readContent(file: IDiscoveredFile): Promise<string> {
    return fs.promises.readFile(file.absolutePath, 'utf-8');
  }
}
