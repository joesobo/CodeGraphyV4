/**
 * @fileoverview Resolves Python import module names to file paths.
 * Handles standard imports, relative imports, and package structures.
 * @module plugins/python/PathResolver
 */

import * as path from 'path';
import * as fs from 'fs';
import { IDetectedImport } from './ImportDetector';

/**
 * Configuration for Python path resolution.
 */
export interface IPythonPathResolverConfig {
  /** Additional source roots (like PYTHONPATH) */
  sourceRoots?: string[];
  /** Whether to resolve __init__.py files */
  resolveInitFiles?: boolean;
}

/**
 * Resolves Python module names to file system paths.
 * 
 * Resolution strategy:
 * 1. For relative imports: resolve relative to the importing file's directory
 * 2. For absolute imports: search in workspace root and source roots
 * 3. Handle __init__.py for package imports
 * 
 * @example
 * ```typescript
 * const resolver = new PathResolver('/workspace');
 * 
 * // Absolute import
 * resolver.resolve({ module: 'mypackage.utils', isRelative: false, ... }, '/workspace/main.py');
 * // => 'mypackage/utils.py' or 'mypackage/utils/__init__.py'
 * 
 * // Relative import
 * resolver.resolve({ module: 'utils', isRelative: true, relativeLevel: 1, ... }, '/workspace/pkg/main.py');
 * // => 'pkg/utils.py'
 * ```
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
   * Resolves a Python import to a workspace-relative file path.
   * 
   * @param imp - The detected import
   * @param fromFile - The file containing the import (workspace-relative or absolute)
   * @returns The resolved path (workspace-relative) or null if unresolved
   */
  resolve(imp: IDetectedImport, fromFile: string): string | null {
    // Normalize fromFile to workspace-relative
    const relativeFromFile = fromFile.startsWith(this._workspaceRoot)
      ? path.relative(this._workspaceRoot, fromFile)
      : fromFile;
    
    const fromDir = path.dirname(relativeFromFile);

    if (imp.isRelative) {
      return this._resolveRelative(imp, fromDir);
    } else {
      return this._resolveAbsolute(imp);
    }
  }

  /**
   * Resolves a relative import (from . import x, from .. import x).
   * In Python:
   * - `.` (level 1) = current package (same directory)
   * - `..` (level 2) = parent package
   * - `...` (level 3) = grandparent package
   */
  private _resolveRelative(imp: IDetectedImport, fromDir: string): string | null {
    // Calculate the target directory based on relative level
    // relativeLevel 1 means current directory, 2 means parent, etc.
    let targetDir = fromDir;
    
    // Go up (relativeLevel - 1) directories since level 1 is current directory
    for (let i = 1; i < imp.relativeLevel; i++) {
      targetDir = path.dirname(targetDir);
      if (targetDir === '.' || targetDir === '') {
        targetDir = '.';
        break;
      }
    }

    // Build the module path
    const moduleParts = imp.module ? imp.module.split('.') : [];
    const modulePath = path.join(targetDir, ...moduleParts);

    return this._resolveModulePath(modulePath);
  }

  /**
   * Resolves an absolute import (import x, from x import y).
   */
  private _resolveAbsolute(imp: IDetectedImport): string | null {
    const moduleParts = imp.module.split('.');
    const modulePath = path.join(...moduleParts);

    // Try workspace root first
    const resolved = this._resolveModulePath(modulePath);
    if (resolved) return resolved;

    // Try source roots
    for (const root of this._config.sourceRoots || []) {
      const rootPath = path.join(root, modulePath);
      const resolvedFromRoot = this._resolveModulePath(rootPath);
      if (resolvedFromRoot) return resolvedFromRoot;
    }

    // Try common Python source directories
    const commonDirs = ['src', 'lib', 'app'];
    for (const dir of commonDirs) {
      const dirPath = path.join(dir, modulePath);
      const resolvedFromDir = this._resolveModulePath(dirPath);
      if (resolvedFromDir) return resolvedFromDir;
    }

    return null;
  }

  /**
   * Resolves a module path to an actual file.
   * Tries: path.py, path/__init__.py
   * 
   * Returns ABSOLUTE paths for consistency with other plugins
   * (WorkspaceAnalyzer expects absolute paths).
   */
  private _resolveModulePath(modulePath: string): string | null {
    // Normalize the path
    const normalized = modulePath.replace(/\\/g, '/');

    // Try direct .py file
    const pyFile = `${normalized}.py`;
    if (this._fileExists(pyFile)) {
      return path.join(this._workspaceRoot, pyFile);
    }

    // Try __init__.py in package directory
    if (this._config.resolveInitFiles) {
      const initFile = path.join(normalized, '__init__.py').replace(/\\/g, '/');
      if (this._fileExists(initFile)) {
        return path.join(this._workspaceRoot, initFile);
      }
    }

    // Try .pyi stub file (for type stubs)
    const pyiFile = `${normalized}.pyi`;
    if (this._fileExists(pyiFile)) {
      return path.join(this._workspaceRoot, pyiFile);
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
