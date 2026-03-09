/**
 * @fileoverview TypeScript/JavaScript plugin for CodeGraphy.
 * Thin orchestrator that loads metadata from manifest.json and delegates
 * detection to individual rule modules in rules/.
 * @module plugins/typescript
 */

import * as fs from 'fs';
import * as path from 'path';
import { IPlugin, IConnection } from '../../core/plugins';
import { PathResolver, IPathResolverConfig } from './PathResolver';
import manifest from './manifest.json';

// Rule detect functions
import { detect as detectEs6Import } from './rules/es6-import';
import { detect as detectReexport } from './rules/reexport';
import { detect as detectDynamicImport } from './rules/dynamic-import';
import { detect as detectCommonjsRequire } from './rules/commonjs-require';

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
    supportedExtensions: manifest.supportedExtensions,
    defaultExclude: manifest.defaultExclude,
    defaultFilterPatterns: manifest.defaultFilterPatterns,
    rules: manifest.rules,
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

    dispose(): void {
      resolver = null;
    },
  };
}

/**
 * Loads tsconfig.json and extracts path resolution settings.
 */
function loadTsConfig(workspaceRoot: string): IPathResolverConfig {
  const configPaths = [
    path.join(workspaceRoot, 'tsconfig.json'),
    path.join(workspaceRoot, 'jsconfig.json'),
  ];

  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');
        // Remove comments (simple approach for JSON with comments)
        const jsonContent = content
          .replace(/\/\*[\s\S]*?\*\//g, '') // Block comments
          .replace(/\/\/.*/g, ''); // Line comments

        const config = JSON.parse(jsonContent);
        const compilerOptions = config.compilerOptions || {};

        return {
          baseUrl: compilerOptions.baseUrl,
          paths: compilerOptions.paths,
        };
      }
    } catch (error) {
      console.warn(`[CodeGraphy] Failed to load ${configPath}:`, error);
    }
  }

  return {};
}

// Default export for convenience
export default createTypeScriptPlugin;
