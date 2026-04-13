/**
 * @fileoverview Resolves Markdown wikilink targets to actual file paths.
 * Uses workspace-root-relative paths so links stay deterministic.
 * @module plugins/markdown/PathResolver
 */

import * as path from 'path';
import * as fs from 'fs';

/**
 * Resolves wikilink targets to absolute file paths.
 *
 * Resolution rules:
 * 1. Target must be workspace-root relative, or include an explicit filename extension.
 * 2. Resolve relative to workspace root.
 * 3. If the target has no extension, append .md and try again.
 */
export class PathResolver {
  private workspaceRoot: string;
  private fileIndex: Map<string, string[]> = new Map();

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  setWorkspaceRoot(workspaceRoot: string): void {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Retained for plugin lifecycle compatibility.
   */
  buildIndex(_files: Array<{ absolutePath: string }>): void {
    this.fileIndex.clear();
  }

  /**
   * Resolve a wikilink target to an absolute file path, or null if not found.
   *
   * @param target - The link target as written (e.g., "docs/Note", "src/file.ts")
   * @param _sourceFile - Absolute path of the file containing the link (unused for now)
   */
  resolve(target: string, _sourceFile: string): string | null {
    const clean = target.split('#')[0].trim();
    if (!clean) return null;

    if (clean.includes('/') || clean.includes('\\') || path.extname(clean) !== '') {
      return this.resolveByPath(clean);
    }

    return null;
  }

  private resolveByPath(target: string): string | null {
    const normalizedTarget = target.replace(/\\/g, '/');
    const candidates = [
      path.join(this.workspaceRoot, normalizedTarget),
      path.join(this.workspaceRoot, normalizedTarget + '.md'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
    return null;
  }
}
