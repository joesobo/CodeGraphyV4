/**
 * @fileoverview TypeScript/JavaScript plugin for CodeGraphy.
 * Thin orchestrator that loads metadata from codegraphy.json and delegates
 * detection to individual source modules in sources/.
 * @module plugins/typescript
 */

import type {
  CodeGraphyAPI,
  Disposable,
  IFileAnalysisResult,
  IPlugin,
} from '@codegraphy-vscode/plugin-api';
import { PathResolver } from './PathResolver';
import { loadTsConfig } from './tsconfig';
import manifest from '../codegraphy.json';
import { createFocusedImportView } from './focusedImports/view';

// Source detect functions
import { detect as detectDynamicImport } from './sources/dynamic-import';
import { detect as detectCommonjsRequire } from './sources/commonjs-require';

export { PathResolver } from './PathResolver';
export type { IPathResolverConfig } from './PathResolver';

/**
 * Built-in plugin for TypeScript and JavaScript files.
 *
 * Uses the TypeScript compiler only for JS/TS cases the Tree-sitter core does
 * not cover yet, then resolves them with tsconfig-aware paths.
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
  let focusedImportViewDisposable: Disposable | null = null;

  const ensureResolver = (workspaceRoot: string): PathResolver => {
    if (!resolver) {
      const config = loadTsConfig(workspaceRoot);
      resolver = new PathResolver(workspaceRoot, config);
    }

    return resolver;
  };

  const buildAnalysisResult = async (
    filePath: string,
    content: string,
    workspaceRoot: string,
  ): Promise<IFileAnalysisResult> => {
    const ctx = { resolver: ensureResolver(workspaceRoot) };
    const connections = [
      // Static imports and re-exports now come from the core Tree-sitter pass.
      ...detectDynamicImport(content, filePath, ctx),
      ...detectCommonjsRequire(content, filePath, ctx),
    ];

    return {
      filePath,
      relations: connections,
    };
  };

  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    apiVersion: manifest.apiVersion,
    supportedExtensions: manifest.supportedExtensions,
    defaultFilters: manifest.defaultFilters,
    sources: manifest.sources,
    fileColors: manifest.fileColors,
    onLoad(api: CodeGraphyAPI): void {
      focusedImportViewDisposable?.dispose();
      focusedImportViewDisposable = api.registerView(createFocusedImportView(manifest.id));
    },
    async initialize(workspaceRoot: string): Promise<void> {
      const config = loadTsConfig(workspaceRoot);
      resolver = new PathResolver(workspaceRoot, config);

      console.log('[CodeGraphy] TypeScript plugin initialized');
    },

    async analyzeFile(
      filePath: string,
      content: string,
      workspaceRoot: string,
    ): Promise<IFileAnalysisResult> {
      return buildAnalysisResult(filePath, content, workspaceRoot);
    },

    onUnload(): void {
      focusedImportViewDisposable?.dispose();
      focusedImportViewDisposable = null;
      resolver = null;
    },
  };
}

// Default export for convenience
export default createTypeScriptPlugin;
