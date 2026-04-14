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

function createDiscoveredFile(relativePath: string, absolutePath: string): IDiscoveredFile {
  return {
    relativePath,
    absolutePath,
    extension: path.extname(absolutePath).toLowerCase(),
    name: path.basename(absolutePath),
  };
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

        files.push(createDiscoveredFile(relativePath, absolutePath));
        totalFound++;
        return true;
      },
      signal,
    );

    const durationMs = Date.now() - startTime;
    return {
      files,
      limitReached,
      totalFound: limitReached ? totalFound : undefined,
      durationMs,
    };
  }

  async readContent(file: IDiscoveredFile): Promise<string> {
    return fs.promises.readFile(file.absolutePath, 'utf-8');
  }
}
