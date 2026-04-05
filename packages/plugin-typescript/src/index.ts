/**
 * @fileoverview TypeScript/JavaScript plugin for CodeGraphy.
 * Thin orchestrator that loads metadata from codegraphy.json and delegates
 * detection to individual source modules in sources/.
 * @module plugins/typescript
 */

import type { IPlugin, IConnection } from '@codegraphy-vscode/plugin-api';
import { PathResolver } from './PathResolver';
import { loadTsConfig } from './tsconfig';
import manifest from '../codegraphy.json';

// Source detect functions
import { detect as detectEs6Import } from './sources/es6-import';
import { detect as detectReexport } from './sources/reexport';
import { detect as detectDynamicImport } from './sources/dynamic-import';
import { detect as detectCommonjsRequire } from './sources/commonjs-require';

export { PathResolver } from './PathResolver';
export type { IPathResolverConfig } from './PathResolver';

/**
 * Built-in plugin for TypeScript and JavaScript files.
 *
 * Uses the TypeScript Compiler API to accurately detect imports,
 * then resolves them to file paths using tsconfig settings.
 *
 * @example
 * ```typescript
 * import { createTypeScriptPlugin } from './plugins/typescript';
 *
 * const plugin = createTypeScriptPlugin();
 * registry.register(plugin, { builtIn: true });
 * ```
 */
export function createTypeScriptPlugin(): IPlugin {
  let resolver: PathResolver | null = null;

  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    apiVersion: manifest.apiVersion,
    supportedExtensions: manifest.supportedExtensions,
    defaultFilters: manifest.defaultFilters,
    sources: manifest.sources,
    fileColors: manifest.fileColors,
    async initialize(workspaceRoot: string): Promise<void> {
      const config = loadTsConfig(workspaceRoot);
      resolver = new PathResolver(workspaceRoot, config);

      console.log('[CodeGraphy] TypeScript plugin initialized');
    },

    async detectConnections(
      filePath: string,
      content: string,
      workspaceRoot: string
    ): Promise<IConnection[]> {
      if (!resolver) {
        const config = loadTsConfig(workspaceRoot);
        resolver = new PathResolver(workspaceRoot, config);
      }

      const ctx = { resolver };

      return [
        ...detectEs6Import(content, filePath, ctx),
        ...detectReexport(content, filePath, ctx),
        ...detectDynamicImport(content, filePath, ctx),
        ...detectCommonjsRequire(content, filePath, ctx),
      ];
    },

    onUnload(): void {
      resolver = null;
    },
  };
}

// Default export for convenience
export default createTypeScriptPlugin;
