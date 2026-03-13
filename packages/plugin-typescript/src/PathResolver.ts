/**
 * @fileoverview Resolves import specifiers to absolute file paths.
 * Handles relative imports, tsconfig paths, and file extension inference.
 * @module plugins/typescript/PathResolver
 */

import * as path from 'path';
import { isBuiltIn, isBareSpecifier } from './builtins';
import { resolveFile } from './fileResolver';

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
  private readonly _config: IPathResolverConfig;
  private readonly _baseUrl: string;

  /**
   * Creates a new PathResolver.
   *
   * @param workspaceRoot - Absolute path to the workspace root
   * @param config - Path resolution configuration (from tsconfig.json)
   */
  constructor(workspaceRoot: string, config: IPathResolverConfig = {}) {
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
    if (isBuiltIn(specifier)) {
      return null;
    }

    // Relative import
    if (specifier.startsWith('.')) {
      const fromDir = path.dirname(fromFile);
      const resolved = path.resolve(fromDir, specifier);
      return resolveFile(resolved);
    }

    // Try path aliases first (e.g., @/components)
    const pathsResolved = this._resolveWithPaths(specifier);
    if (pathsResolved) {
      return pathsResolved;
    }

    // Try baseUrl-relative (when baseUrl is set)
    if (this._config.baseUrl) {
      const resolved = path.resolve(this._baseUrl, specifier);
      const result = resolveFile(resolved);
      if (result) {
        return result;
      }
    }

    // At this point, it's either a node_modules package or unresolved
    // Bare specifiers (packages) return null
    if (isBareSpecifier(specifier)) {
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
          const resolved = resolveFile(fullPath);
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
}
