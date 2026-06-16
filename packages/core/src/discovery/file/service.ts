/**
 * @fileoverview File discovery system for finding source files in a workspace.
 * @module core/discovery/file/service
 */

import * as fs from 'fs';
import * as path from 'path';
import { IDiscoveryOptions, IDiscoveredFile, IDiscoveryResult } from '../contracts';
import { throwIfAborted } from '../abort';
import { loadGitignore } from '../gitignore';
import { DEFAULT_EXCLUDE } from '../pathMatching';
import { shouldIncludeFile } from './filter';
import { walkDirectory } from './walk';
import { DEFAULT_INCLUDE, EMPTY_PATTERNS, DEFAULT_MAX_FILES } from './defaults';

function getDiscoveryConfig(options: IDiscoveryOptions) {
  return {
    maxFiles: options.maxFiles ?? DEFAULT_MAX_FILES,
    includePatterns: options.include ?? DEFAULT_INCLUDE,
    excludePatterns: options.exclude ?? EMPTY_PATTERNS,
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

function isGitIgnoredPath(
  gitignore: ReturnType<typeof loadGitignore>,
  relativePath: string,
  kind: 'directory' | 'file',
): boolean {
  if (!gitignore) {
    return false;
  }

  return kind === 'directory'
    ? gitignore.ignores(`${relativePath}/`) || gitignore.ignores(relativePath)
    : gitignore.ignores(relativePath);
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
    } = getDiscoveryConfig(options);

    throwIfAborted(signal);

    const allExclude = [...DEFAULT_EXCLUDE, ...excludePatterns];
    const gitignore = respectGitignore ? loadGitignore(rootPath) : null;
    const files: IDiscoveredFile[] = [];
    const directories: string[] = [];
    const gitIgnoredPaths = new Set<string>();
    let totalFound = 0;
    let limitReached = false;

    await walkDirectory(
      rootPath,
      rootPath,
      (relativePath, absolutePath) => {
        throwIfAborted(signal);

        if (files.length >= maxFiles) {
          limitReached = true;
          totalFound++;
          return false;
        }

        if (!shouldIncludeFile(relativePath, absolutePath, {
          includePatterns,
          excludePatterns: allExclude,
          extensions,
          gitignore,
        })) {
          return true;
        }

        const gitIgnored = isGitIgnoredPath(gitignore, relativePath, 'file');
        if (gitIgnored) {
          gitIgnoredPaths.add(relativePath);
        }

        files.push(createDiscoveredFile(relativePath, absolutePath, gitIgnored));
        totalFound++;
        return true;
      },
      relativePath => {
        if (isGitIgnoredPath(gitignore, relativePath, 'directory')) {
          gitIgnoredPaths.add(relativePath);
        }

        directories.push(relativePath);
      },
      signal,
    );

    const durationMs = Date.now() - startTime;
    return {
      files,
      directories,
      gitIgnoredPaths: [...gitIgnoredPaths],
      limitReached,
      totalFound: limitReached ? totalFound : undefined,
      durationMs,
    };
  }

  async readContent(file: IDiscoveredFile): Promise<string> {
    return fs.promises.readFile(file.absolutePath, 'utf-8');
  }
}
