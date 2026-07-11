/**
 * @fileoverview File discovery system for finding source files in a workspace.
 * @module core/discovery/file/service
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { IDiscoveryOptions, IDiscoveredFile, IDiscoveryResult } from '../contracts';
import { throwIfAborted } from '../abort';
import { DEFAULT_EXCLUDE } from '../pathMatching';
import { shouldIncludeFile } from './filter';
import { walkDirectory } from './walk';
import { DEFAULT_INCLUDE, EMPTY_PATTERNS, DEFAULT_MAX_FILES } from './defaults';
import { isFilesExcludedPath } from './filesExclude';

function getDiscoveryConfig(options: IDiscoveryOptions) {
  return {
    maxFiles: options.maxFiles ?? DEFAULT_MAX_FILES,
    includePatterns: options.include ?? DEFAULT_INCLUDE,
    excludePatterns: options.exclude ?? EMPTY_PATTERNS,
    respectGitignore: options.respectGitignore ?? true,
    extensions: options.extensions ?? EMPTY_PATTERNS,
    filesExcludeRules: options.filesExclude ?? [],
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

export class FileDiscovery {
  async discover(options: IDiscoveryOptions): Promise<IDiscoveryResult> {
    const startTime = Date.now();
    const { rootPath, signal } = options;
    const {
      maxFiles,
      includePatterns,
      excludePatterns,
      respectGitignore,
      extensions,
      filesExcludeRules,
    } = getDiscoveryConfig(options);

    throwIfAborted(signal);

    const allExclude = [...DEFAULT_EXCLUDE, ...excludePatterns];
    const discoveredFiles: Array<{ absolutePath: string; relativePath: string }> = [];
    const directories: string[] = [];
    const filesExcludedPaths: string[] = [];
    let totalFound = 0;
    let limitReached = false;

    await walkDirectory(
      rootPath,
      rootPath,
      (relativePath, absolutePath, siblingNames) => {
        throwIfAborted(signal);

        if (discoveredFiles.length >= maxFiles) {
          limitReached = true;
          totalFound++;
          return false;
        }

        if (!shouldIncludeFile(relativePath, absolutePath, {
          includePatterns,
          excludePatterns: allExclude,
          extensions,
          gitignore: null,
        })) {
          return true;
        }

        if (isFilesExcludedPath(relativePath, filesExcludeRules, siblingNames)) {
          filesExcludedPaths.push(relativePath);
          return true;
        }

        discoveredFiles.push({ absolutePath, relativePath });
        totalFound++;
        return true;
      },
      (relativePath, _absolutePath, siblingNames) => {
        if (isFilesExcludedPath(
          relativePath,
          filesExcludeRules,
          siblingNames,
        )) {
          filesExcludedPaths.push(relativePath);
          return false;
        }
        directories.push(relativePath);
        return true;
      },
      signal,
    );

    const gitIgnoredPaths = respectGitignore
      ? collectGitIgnoredPaths(
        rootPath,
        discoveredFiles.map(file => file.relativePath),
        directories,
      )
      : new Set<string>();
    const files = discoveredFiles.map(file =>
      createDiscoveredFile(
        file.relativePath,
        file.absolutePath,
        gitIgnoredPaths.has(file.relativePath),
      ),
    );

    const durationMs = Date.now() - startTime;
    return {
      files,
      directories,
      gitIgnoredPaths: [...gitIgnoredPaths],
      filesExcludedPaths,
      filesExcludedCount: filesExcludedPaths.length,
      limitReached,
      totalFound: limitReached ? totalFound : undefined,
      durationMs,
    };
  }

  async readContent(file: IDiscoveredFile): Promise<string> {
    return fs.promises.readFile(file.absolutePath, 'utf-8');
  }
}
