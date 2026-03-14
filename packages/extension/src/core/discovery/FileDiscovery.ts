/**
 * @fileoverview File discovery system for finding source files in a workspace.
 * Supports glob patterns, gitignore, and file limits.
 * @module core/discovery/FileDiscovery
 */

import * as fs from 'fs';
import * as path from 'path';
import { IDiscoveryOptions, IDiscoveredFile, IDiscoveryResult } from './types';
import { throwIfAborted } from './discoveryAbort';
import { loadGitignore } from './discoveryGitignore';
import {
  DEFAULT_EXCLUDE,
  matchesAnyPattern,
  shouldSkipKnownDirectory,
} from './discoveryPathMatching';

const DEFAULT_INCLUDE = ['**/*'];
const EMPTY_PATTERNS: string[] = [];
const DEFAULT_MAX_FILES = 500;

/**
 * Discovers source files in a workspace.
 * 
 * The FileDiscovery class walks the file system starting from a root path,
 * applying include/exclude patterns and respecting .gitignore files.
 * It enforces a maximum file limit to prevent performance issues with
 * large codebases.
 * 
 * @example
 * ```typescript
 * const discovery = new FileDiscovery();
 * const result = await discovery.discover({
 *   rootPath: '/path/to/project',
 *   maxFiles: 100,
 *   include: ['src/**\/*'],
 *   exclude: ['**\/*.test.ts'],
 *   respectGitignore: true,
 *   extensions: ['.ts', '.tsx']
 * });
 * 
 * if (result.limitReached) {
 *   console.warn(`Limit reached, found ${result.totalFound} files`);
 * }
 * ```
 */
export class FileDiscovery {
  /**
   * Discovers files in the workspace according to the given options.
   * 
   * @param options - Discovery options
   * @returns Discovery result with files and metadata
   */
  async discover(options: IDiscoveryOptions): Promise<IDiscoveryResult> {
    const startTime = Date.now();

    const { rootPath, signal } = options;
    const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
    const includePatterns = options.include ?? DEFAULT_INCLUDE;
    const excludePatterns = options.exclude ?? EMPTY_PATTERNS;
    const respectGitignore = options.respectGitignore ?? true;
    const extensions = options.extensions ?? EMPTY_PATTERNS;

    throwIfAborted(signal);

    // Combine default and custom exclude patterns
    const allExclude = [...DEFAULT_EXCLUDE, ...excludePatterns];

    // Load gitignore if requested
    const gitignore = respectGitignore ? loadGitignore(rootPath) : null;

    const files: IDiscoveredFile[] = [];
    let totalFound = 0;
    let limitReached = false;

    // Walk the directory tree
    await this._walkDirectory(
      rootPath,
      rootPath,
      (relativePath, absolutePath) => {
        throwIfAborted(signal);

        // Check if we've hit the limit
        if (files.length >= maxFiles) {
          limitReached = true;
          totalFound++;
          return false; // Stop walking
        }

        // Check gitignore
        if (gitignore && gitignore.ignores(relativePath)) {
          return true; // Skip but continue
        }

        // Check exclude patterns
        if (matchesAnyPattern(relativePath, allExclude)) {
          return true; // Skip but continue
        }

        // Check include patterns
        if (!matchesAnyPattern(relativePath, includePatterns)) {
          return true; // Skip but continue
        }

        // Check extension filter
        const ext = path.extname(absolutePath).toLowerCase();
        if (extensions.length > 0 && !extensions.includes(ext)) {
          return true; // Skip but continue
        }

        // Add the file
        files.push({
          relativePath,
          absolutePath,
          extension: ext,
          name: path.basename(absolutePath),
        });
        totalFound++;
        
        return true; // Continue walking
      },
      signal
    );

    const durationMs = Date.now() - startTime;

    return {
      files,
      limitReached,
      totalFound: limitReached ? totalFound : undefined,
      durationMs,
    };
  }

  /**
   * Reads the content of a file.
   * 
   * @param file - The discovered file to read
   * @returns File content as a string
   */
  async readContent(file: IDiscoveredFile): Promise<string> {
    return fs.promises.readFile(file.absolutePath, 'utf-8');
  }

  /**
   * Recursively walks a directory, calling the callback for each file.
   * 
   * @param rootPath - The original root path
   * @param currentPath - Current directory being walked
   * @param onFile - Callback for each file. Return false to stop walking.
   */
  private async _walkDirectory(
    rootPath: string,
    currentPath: string,
    onFile: (relativePath: string, absolutePath: string) => boolean,
    signal?: AbortSignal
  ): Promise<boolean> {
    throwIfAborted(signal);

    let entries: fs.Dirent[];
    
    try {
      entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
    } catch {
      // Skip directories we can't read
      return true;
    }

    for (const entry of entries) {
      throwIfAborted(signal);

      const absolutePath = path.join(currentPath, entry.name);
      const relativePath = path.relative(rootPath, absolutePath);

      if (entry.isDirectory()) {
        // Quick check: skip known large directories early
        if (shouldSkipKnownDirectory(relativePath)) {
          continue;
        }
        
        // Recurse into directory
        const shouldContinue = await this._walkDirectory(rootPath, absolutePath, onFile, signal);
        if (!shouldContinue) {
          return false;
        }
      } else if (entry.isFile()) {
        const shouldContinue = onFile(relativePath, absolutePath);
        if (!shouldContinue) {
          return false;
        }
      }
      // Skip symlinks and other types
    }

    return true;
  }
}
