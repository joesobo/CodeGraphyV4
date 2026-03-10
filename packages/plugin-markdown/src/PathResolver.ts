/**
 * @fileoverview Resolves Markdown wikilink targets to actual file paths.
 * Follows Obsidian's resolution rules: shortest unique path match.
 * @module plugins/markdown/PathResolver
 */

import * as path from 'path';
import * as fs from 'fs';

/**
 * Resolves wikilink targets to absolute file paths.
 *
 * Resolution rules (mirrors Obsidian):
 * 1. If the target contains a path separator, resolve relative to workspace root.
 * 2. Otherwise, search all known .md files for a filename match (case-insensitive).
 * 3. If no .md file matches, append .md and try again.
 */
export class PathResolver {
  private workspaceRoot: string;
  /** Map from lowercase filename (no extension) to absolute paths */
  private fileIndex: Map<string, string[]> = new Map();

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Build an index of all .md files in the workspace for fast lookup.
   * Call this once via preAnalyze before resolving links.
   */
  buildIndex(files: Array<{ absolutePath: string }>): void {
    this.fileIndex.clear();
    for (const { absolutePath } of files) {
      const stem = path.basename(absolutePath, path.extname(absolutePath)).toLowerCase();
      if (!this.fileIndex.has(stem)) {
        this.fileIndex.set(stem, []);
      }
      this.fileIndex.get(stem)!.push(absolutePath);
    }
  }

  /**
   * Resolve a wikilink target to an absolute file path, or null if not found.
   *
   * @param target - The link target as written (e.g., "Note Name", "folder/note")
   * @param _sourceFile - Absolute path of the file containing the link (unused for now)
   */
  resolve(target: string, _sourceFile: string): string | null {
    // Normalize: strip fragment (#heading), trim whitespace
    const clean = target.split('#')[0].trim();
    if (!clean) return null;

    // If target contains a path separator, try as a relative-to-root path
    if (clean.includes('/') || clean.includes('\\')) {
      return this.resolveByPath(clean);
    }

    // Otherwise search index by stem (filename without extension)
    return this.resolveByName(clean);
  }

  private resolveByPath(target: string): string | null {
    // Try with and without .md extension
    const candidates = [
      path.join(this.workspaceRoot, target),
      path.join(this.workspaceRoot, target + '.md'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
    return null;
  }

  private resolveByName(target: string): string | null {
    const stem = path.basename(target, path.extname(target)).toLowerCase();
    const matches = this.fileIndex.get(stem);
    if (!matches || matches.length === 0) return null;
    // If multiple matches, prefer the shortest path (closest to root — Obsidian behavior)
    return matches.reduce((a, b) => (a.length <= b.length ? a : b));
  }
}
