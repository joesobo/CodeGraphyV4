/**
 * @fileoverview File discovery system for finding source files in a workspace.
 * Supports glob patterns, gitignore, and file limits.
 * @module core/discovery/FileDiscovery
 */

import * as fs from 'fs';
import * as path from 'path';
import ignore, { Ignore } from 'ignore';
import { minimatch } from 'minimatch';
import { IDiscoveryOptions, IDiscoveredFile, IDiscoveryResult } from './types';

/**
 * Default exclude patterns applied to all discoveries.
 */
const DEFAULT_EXCLUDE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/.git/**',
  '**/coverage/**',
  '**/*.min.js',
  '**/*.bundle.js',
  '**/*.map',
];

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
    
    const {
      rootPath,
      maxFiles = 100,
      include = ['**/*'],
      exclude = [],
      respectGitignore = true,
      extensions = [],
    } = options;

    // Combine default and custom exclude patterns
    const allExclude = [...DEFAULT_EXCLUDE, ...exclude];
    
    // Load gitignore if requested
    const gitignore = respectGitignore ? this._loadGitignore(rootPath) : null;
    
    const files: IDiscoveredFile[] = [];
    let totalFound = 0;
    let limitReached = false;

    // Walk the directory tree
    await this._walkDirectory(
      rootPath,
      rootPath,
      (relativePath, absolutePath) => {
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
        if (this._matchesAny(relativePath, allExclude)) {
          return true; // Skip but continue
        }

        // Check include patterns
        if (!this._matchesAny(relativePath, include)) {
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
      }
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
   * Loads and parses .gitignore file from the root path.
   */
  private _loadGitignore(rootPath: string): Ignore | null {
    const gitignorePath = path.join(rootPath, '.gitignore');
    
    try {
      if (fs.existsSync(gitignorePath)) {
        const content = fs.readFileSync(gitignorePath, 'utf-8');
        const ig = ignore();
        ig.add(content);
        return ig;
      }
    } catch (error) {
      console.warn('[CodeGraphy] Failed to load .gitignore:', error);
    }
    
    return null;
  }

  /**
   * Checks if a path matches any of the given glob patterns.
   */
  private _matchesAny(relativePath: string, patterns: string[]): boolean {
    // Normalize path separators for cross-platform matching
    const normalizedPath = relativePath.replace(/\\/g, '/');
    
    return patterns.some((pattern) => 
      minimatch(normalizedPath, pattern, { dot: true })
    );
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
    onFile: (relativePath: string, absolutePath: string) => boolean
  ): Promise<boolean> {
    let entries: fs.Dirent[];
    
    try {
      entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
    } catch (error) {
      // Skip directories we can't read
      return true;
    }

    for (const entry of entries) {
      const absolutePath = path.join(currentPath, entry.name);
      const relativePath = path.relative(rootPath, absolutePath);

      if (entry.isDirectory()) {
        // Quick check: skip known large directories early
        const normalizedRelative = relativePath.replace(/\\/g, '/');
        if (normalizedRelative === 'node_modules' || 
            normalizedRelative === '.git' ||
            normalizedRelative.startsWith('node_modules/') ||
            normalizedRelative.startsWith('.git/')) {
          continue;
        }
        
        // Recurse into directory
        const shouldContinue = await this._walkDirectory(rootPath, absolutePath, onFile);
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
