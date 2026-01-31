/**
 * @fileoverview Resolves import specifiers to absolute file paths.
 * Handles relative imports, tsconfig paths, and file extension inference.
 * @module plugins/typescript/PathResolver
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Configuration for path resolution, typically loaded from tsconfig.json.
 */
export interface IPathResolverConfig {
  /** Base URL for non-relative imports */
  baseUrl?: string;
  /** Path aliases (e.g., { "@/*": ["src/*"] }) */
  paths?: Record<string, string[]>;
}

/**
 * File extensions to try when resolving imports (in order).
 */
const RESOLVE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'];

/**
 * Index file names to try when resolving directory imports.
 */
const INDEX_FILES = ['index.ts', 'index.tsx', 'index.js', 'index.jsx'];

/**
 * Resolves import specifiers to absolute file paths.
 * 
 * The PathResolver handles several types of imports:
 * - Relative imports: `./utils`, `../helpers`
 * - tsconfig path aliases: `@/components/Button`
 * - Directory imports: `./utils` → `./utils/index.ts`
 * - Extension inference: `./utils` → `./utils.ts`
 * 
 * It does NOT resolve:
 * - Node modules (returns null for 'lodash', 'react', etc.)
 * - Built-in modules (returns null for 'fs', 'path', etc.)
 * 
 * @example
 * ```typescript
 * const resolver = new PathResolver('/project', {
 *   baseUrl: '.',
 *   paths: { '@/*': ['src/*'] }
 * });
 * 
 * // Relative import
 * resolver.resolve('./utils', '/project/src/app.ts');
 * // → '/project/src/utils.ts'
 * 
 * // Path alias
 * resolver.resolve('@/components/Button', '/project/src/app.ts');
 * // → '/project/src/components/Button.tsx'
 * ```
 */
export class PathResolver {
  private readonly _workspaceRoot: string;
  private readonly _config: IPathResolverConfig;
  private readonly _baseUrl: string;

  /**
   * Creates a new PathResolver.
   * 
   * @param workspaceRoot - Absolute path to the workspace root
   * @param config - Path resolution configuration (from tsconfig.json)
   */
  constructor(workspaceRoot: string, config: IPathResolverConfig = {}) {
    this._workspaceRoot = workspaceRoot;
    this._config = config;
    this._baseUrl = config.baseUrl
      ? path.resolve(workspaceRoot, config.baseUrl)
      : workspaceRoot;
  }

  /**
   * Resolves an import specifier to an absolute file path.
   * 
   * @param specifier - The import specifier (e.g., './utils', '@/lib')
   * @param fromFile - Absolute path to the file containing the import
   * @returns Absolute path to the resolved file, or null if unresolved
   */
  resolve(specifier: string, fromFile: string): string | null {
    // Skip node built-ins
    if (this._isBuiltIn(specifier)) {
      return null;
    }

    // Relative import
    if (specifier.startsWith('.')) {
      const fromDir = path.dirname(fromFile);
      const resolved = path.resolve(fromDir, specifier);
      return this._resolveFile(resolved);
    }

    // Try path aliases first (e.g., @/components)
    const pathsResolved = this._resolveWithPaths(specifier);
    if (pathsResolved) {
      return pathsResolved;
    }

    // Try baseUrl-relative (when baseUrl is set)
    if (this._config.baseUrl) {
      const resolved = path.resolve(this._baseUrl, specifier);
      const result = this._resolveFile(resolved);
      if (result) {
        return result;
      }
    }

    // At this point, it's either a node_modules package or unresolved
    // Bare specifiers (packages) return null
    if (this._isBareSpecifier(specifier)) {
      return null;
    }

    return null;
  }

  /**
   * Attempts to resolve using tsconfig paths.
   */
  private _resolveWithPaths(specifier: string): string | null {
    const { paths } = this._config;
    if (!paths) return null;

    for (const [pattern, targets] of Object.entries(paths)) {
      const match = this._matchPathPattern(specifier, pattern);
      if (match !== null) {
        for (const target of targets) {
          const resolvedTarget = target.replace('*', match);
          const fullPath = path.resolve(this._baseUrl, resolvedTarget);
          const resolved = this._resolveFile(fullPath);
          if (resolved) {
            return resolved;
          }
        }
      }
    }

    return null;
  }

  /**
   * Matches a specifier against a path pattern.
   * Returns the matched wildcard part, or null if no match.
   */
  private _matchPathPattern(specifier: string, pattern: string): string | null {
    if (pattern.includes('*')) {
      const [prefix, suffix] = pattern.split('*');
      if (specifier.startsWith(prefix) && specifier.endsWith(suffix || '')) {
        return specifier.slice(prefix.length, suffix ? -suffix.length || undefined : undefined);
      }
    } else if (specifier === pattern) {
      return '';
    }
    return null;
  }

  /**
   * Resolves a path to an actual file, trying extensions and index files.
   */
  private _resolveFile(basePath: string): string | null {
    // Check if it's already a file with extension
    if (this._fileExists(basePath)) {
      return basePath;
    }

    // Try adding extensions
    for (const ext of RESOLVE_EXTENSIONS) {
      const withExt = basePath + ext;
      if (this._fileExists(withExt)) {
        return withExt;
      }
    }

    // Try as directory with index file
    for (const indexFile of INDEX_FILES) {
      const indexPath = path.join(basePath, indexFile);
      if (this._fileExists(indexPath)) {
        return indexPath;
      }
    }

    return null;
  }

  /**
   * Checks if a path points to an existing file (not directory).
   */
  private _fileExists(filePath: string): boolean {
    try {
      const stat = fs.statSync(filePath);
      return stat.isFile();
    } catch {
      return false;
    }
  }

  /**
   * Checks if a specifier is a Node.js built-in module.
   */
  private _isBuiltIn(specifier: string): boolean {
    const builtins = [
      'fs', 'path', 'os', 'crypto', 'http', 'https', 'url', 'util',
      'stream', 'events', 'buffer', 'child_process', 'cluster',
      'dns', 'net', 'readline', 'tls', 'dgram', 'assert', 'zlib',
      'querystring', 'string_decoder', 'timers', 'tty', 'v8', 'vm',
      'worker_threads', 'perf_hooks', 'async_hooks', 'inspector',
    ];
    
    const base = specifier.startsWith('node:') 
      ? specifier.slice(5) 
      : specifier;
    
    return builtins.includes(base.split('/')[0]);
  }

  /**
   * Checks if a specifier is a bare specifier (node_modules package).
   * Bare specifiers don't start with '.', '/', or a protocol.
   */
  private _isBareSpecifier(specifier: string): boolean {
    if (specifier.startsWith('.') || specifier.startsWith('/')) {
      return false;
    }
    // Check for scoped packages (@scope/pkg) or regular packages
    return /^(@[\w-]+\/)?[\w-]/.test(specifier);
  }
}
