/**
 * @fileoverview Python plugin for CodeGraphy.
 * Thin orchestrator that loads metadata from codegraphy.json and delegates
 * detection to individual source modules in sources/.
 * @module plugins/python
 */

import type { IPlugin, IConnection } from '@codegraphy-vscode/plugin-api';
import { PathResolver } from './PathResolver';
import { loadPythonConfig } from './projectConfig';
import { assertPythonAstRuntimeAvailable, parsePythonImports } from './astParser';
import manifest from '../codegraphy.json';

// Source detect functions
import { detect as detectImportModule } from './sources/import-module';
import { detect as detectFromImportAbsolute } from './sources/from-import-absolute';
import { detect as detectFromImportRelative } from './sources/from-import-relative';

export { PathResolver } from './PathResolver';
export type { IPythonPathResolverConfig, IDetectedImport } from './PathResolver';

/**
 * Built-in plugin for Python files.
 *
 * Uses Python AST parsing to detect import statements, then resolves
 * local imports to file paths using Python module resolution sources.
 *
 * Supports:
 * - Python source files (.py)
 * - Type stub files (.pyi)
 * - Standard imports (import x)
 * - From imports (from x import y)
 * - Relative imports (from . import x, from .. import x)
 * - Package imports (__init__.py resolution)
 *
 * @example
 * ```typescript
 * import { createPythonPlugin } from './plugins/python';
 *
 * const plugin = createPythonPlugin();
 * registry.register(plugin, { builtIn: true });
 * ```
 */
export function createPythonPlugin(): IPlugin {
  let resolver: PathResolver | null = null;
  let pythonRuntimeReady = false;

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
      assertPythonAstRuntimeAvailable();
      pythonRuntimeReady = true;
      const config = await loadPythonConfig(workspaceRoot);
      resolver = new PathResolver(workspaceRoot, config);
      console.log('[CodeGraphy] Python plugin initialized');
    },

    async detectConnections(
      filePath: string,
      content: string,
      workspaceRoot: string
    ): Promise<IConnection[]> {
      if (!pythonRuntimeReady) {
        assertPythonAstRuntimeAvailable();
        pythonRuntimeReady = true;
      }

      if (!resolver) {
        const config = await loadPythonConfig(workspaceRoot);
        resolver = new PathResolver(workspaceRoot, config);
      }

      const imports = parsePythonImports(content);
      const ctx = { resolver, imports };

      return [
        ...detectImportModule(content, filePath, ctx),
        ...detectFromImportAbsolute(content, filePath, ctx),
        ...detectFromImportRelative(content, filePath, ctx),
      ];
    },

    onUnload(): void {
      resolver = null;
      pythonRuntimeReady = false;
    },
  };
}

// Default export for convenience
export default createPythonPlugin;
