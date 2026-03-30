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

export class FileDiscovery {
  async discover(options: IDiscoveryOptions): Promise<IDiscoveryResult> {
    const startTime = Date.now();
    const { rootPath, signal } = options;
    const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
    const includePatterns = options.include ?? DEFAULT_INCLUDE;
    const excludePatterns = options.exclude ?? EMPTY_PATTERNS;
    const respectGitignore = options.respectGitignore ?? true;
    const extensions = options.extensions ?? EMPTY_PATTERNS;

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

        const ext = path.extname(absolutePath).toLowerCase();
        files.push({
          relativePath,
          absolutePath,
          extension: ext,
          name: path.basename(absolutePath),
        });
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
