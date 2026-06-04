/**
 * @fileoverview Resolves Markdown wikilink targets to actual file paths.
 * Uses workspace-root-relative paths so links stay deterministic.
 * @module plugins/markdown/PathResolver
 */

import * as path from 'path';

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
  buildIndex(files: Array<{ absolutePath: string }>): void {
    this.fileIndex.clear();

    for (const { absolutePath } of files) {
      const relativePath = this.toLookupKey(path.relative(this.workspaceRoot, absolutePath));
      const existing = this.fileIndex.get(relativePath) ?? [];
      existing.push(absolutePath);
      this.fileIndex.set(relativePath, existing);
    }
  }

  /**
   * Resolve a wikilink target to an absolute file path, or null if not found.
   *
   * @param target - The link target as written (e.g., "docs/Note", "src/file.ts")
   * @param _sourceFile - Absolute path of the file containing the link (unused for now)
   */
  resolve(target: string, sourceFile: string): string | null {
    const clean = target.split('#')[0].trim();
    if (!clean) return null;

    if (clean.includes('/') || clean.includes('\\') || path.extname(clean) !== '') {
      return this.resolveByPath(clean, sourceFile);
    }

    return null;
  }

  private resolveByPath(target: string, sourceFile: string): string | null {
    const candidates = this.buildPathCandidates(target);

    for (const candidate of this.buildSourceScopedCandidates(candidates, sourceFile)) {
      const indexedCandidate = this.fileIndex.get(this.toLookupKey(candidate))?.[0];
      if (indexedCandidate) {
        return indexedCandidate;
      }
    }

    return path.join(this.workspaceRoot, candidates[0]);
  }

  private buildSourceScopedCandidates(candidates: string[], sourceFile: string): string[] {
    const sourceRelativePath = this.toLookupKey(path.relative(this.workspaceRoot, sourceFile));
    const sourceTopLevel = sourceRelativePath.split('/')[0];
    if (!sourceTopLevel || sourceTopLevel === sourceRelativePath) {
      return candidates;
    }

    const scopedCandidates = candidates.map(candidate => `${sourceTopLevel}/${candidate}`);
    return [...candidates, ...scopedCandidates];
  }

  private buildPathCandidates(target: string): string[] {
    const normalizedTarget = target.replace(/\\/g, '/');

    if (path.extname(normalizedTarget) !== '') {
      return [normalizedTarget];
    }

    return [normalizedTarget + '.md'];
  }

  private toLookupKey(filePath: string): string {
    return filePath.replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();
  }
}
