/**
 * @fileoverview TypeScript/JavaScript plugin for CodeGraphy.
 * Thin orchestrator that loads metadata from codegraphy.json and delegates
 * detection to individual rule modules in rules/.
 * @module plugins/typescript
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import type { IPlugin, IConnection } from '@codegraphy/plugin-api';
import { PathResolver, IPathResolverConfig } from './PathResolver';
import manifest from '../codegraphy.json';

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
    apiVersion: manifest.apiVersion,
    supportedExtensions: manifest.supportedExtensions,
    defaultFilters: manifest.defaultFilters,
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

    onUnload(): void {
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
        const parsed = ts.parseConfigFileTextToJson(configPath, content);
        if (parsed.error) {
          const message = ts.flattenDiagnosticMessageText(parsed.error.messageText, '\n');
          throw new Error(message);
        }

        const compilerOptions = getCompilerOptions(parsed.config);

        return {
          baseUrl: getBaseUrl(compilerOptions),
          paths: getPaths(compilerOptions),
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getCompilerOptions(config: unknown): Record<string, unknown> {
  if (!isRecord(config)) return {};
  const compilerOptions = config.compilerOptions;
  return isRecord(compilerOptions) ? compilerOptions : {};
}

function getBaseUrl(compilerOptions: Record<string, unknown>): string | undefined {
  const baseUrl = compilerOptions.baseUrl;
  return typeof baseUrl === 'string' ? baseUrl : undefined;
}

function getPaths(
  compilerOptions: Record<string, unknown>
): Record<string, string[]> | undefined {
  const paths = compilerOptions.paths;
  if (!isRecord(paths)) return undefined;

  const entries: Array<[string, string[]]> = [];

  for (const [alias, targetValue] of Object.entries(paths)) {
    if (!Array.isArray(targetValue)) return undefined;
    if (!targetValue.every((item) => typeof item === 'string')) return undefined;
    entries.push([alias, targetValue]);
  }

  return Object.fromEntries(entries);
}
