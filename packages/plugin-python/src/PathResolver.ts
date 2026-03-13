/**
 * @fileoverview Resolves Python import module names to file paths.
 * Handles standard imports, relative imports, and package structures.
 * @module plugins/python/PathResolver
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Represents a detected import in a Python source file.
 */
export interface IDetectedImport {
  /** The module name/path as written (e.g., 'os', 'mypackage.utils') */
  module: string;
  /** Items imported (for 'from x import y') */
  names?: string[];
  /** Whether this is a relative import (starts with .) */
  isRelative: boolean;
  /** Number of parent levels for relative imports (e.g., '..' = 2) */
  relativeLevel: number;
  /** The type of import statement */
  type: 'import' | 'from';
  /** Line number where the import appears (1-indexed) */
  line: number;
}

/**
 * Configuration for Python path resolution.
 */
export interface IPythonPathResolverConfig {
  /** Additional source roots (like PYTHONPATH) */
  sourceRoots?: string[];
  /** Whether to resolve __init__.py files */
  resolveInitFiles?: boolean;
}

const COMMON_SOURCE_DIRECTORIES = ['src', 'lib', 'app'] as const;

/**
 * Resolves Python module names to file system paths.
 *
 * Resolution strategy:
 * 1. For relative imports: resolve relative to the importing file's directory
 * 2. For absolute imports: search in workspace root and source roots
 * 3. Handle __init__.py for package imports
 */
export class PathResolver {
  private _workspaceRoot: string;
  private _config: IPythonPathResolverConfig;

  constructor(workspaceRoot: string, config: IPythonPathResolverConfig = {}) {
    this._workspaceRoot = workspaceRoot;
    this._config = {
      sourceRoots: config.sourceRoots || [],
      resolveInitFiles: config.resolveInitFiles ?? true,
    };
  }

  /**
   * Resolves a Python import to an absolute file path.
   *
   * @param imp - The detected import
   * @param fromFile - The file containing the import (workspace-relative or absolute)
   * @returns The resolved absolute path or null if unresolved
   */
  resolve(imp: IDetectedImport, fromFile: string): string | null {
    const absoluteFromFile = path.isAbsolute(fromFile)
      ? fromFile
      : path.join(this._workspaceRoot, fromFile);
    const relativeFromFile = path.relative(this._workspaceRoot, absoluteFromFile);
    const fromDir = path.dirname(relativeFromFile);

    const modulePath = imp.isRelative
      ? this._buildRelativeModulePath(imp, fromDir)
      : path.join(...imp.module.split('.'));

    const candidateRoots = imp.isRelative
      ? ['']
      : ['', ...(this._config.sourceRoots ?? []), ...COMMON_SOURCE_DIRECTORIES];

    return this._resolveFromCandidateRoots(modulePath, candidateRoots);
  }

  private _buildRelativeModulePath(imp: IDetectedImport, fromDir: string): string {
    const upwardSteps = Math.max(0, imp.relativeLevel - 1);
    const upwardSegments = Array.from({ length: upwardSteps }, () => '..');
    const moduleSegments = imp.module ? imp.module.split('.') : [];

    return path.join(fromDir, ...upwardSegments, ...moduleSegments);
  }

  private _resolveFromCandidateRoots(modulePath: string, candidateRoots: readonly string[]): string | null {
    for (const root of candidateRoots) {
      const rootedPath = root ? path.join(root, modulePath) : modulePath;
      const resolved = this._resolveModulePath(rootedPath);
      if (resolved) {
        return resolved;
      }
    }

    return null;
  }

  /**
   * Resolves a module path to an actual file.
   * Tries: path.py, path/__init__.py, path.pyi
   */
  private _resolveModulePath(modulePath: string): string | null {
    const normalizedPath = modulePath.replace(/\\/g, '/');
    const candidates: string[] = [`${normalizedPath}.py`];

    if (this._config.resolveInitFiles) {
      candidates.push(path.posix.join(normalizedPath, '__init__.py'));
    }

    candidates.push(`${normalizedPath}.pyi`);

    for (const candidate of candidates) {
      if (this._fileExists(candidate)) {
        return path.join(this._workspaceRoot, candidate);
      }
    }

    return null;
  }

  /**
   * Checks if a file exists in the workspace.
   */
  private _fileExists(relativePath: string): boolean {
    try {
      const fullPath = path.join(this._workspaceRoot, relativePath);
      return fs.existsSync(fullPath) && fs.statSync(fullPath).isFile();
    } catch {
      return false;
    }
  }
}
