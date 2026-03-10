/**
 * @fileoverview Python plugin for CodeGraphy.
 * Thin orchestrator that loads metadata from codegraphy.json and delegates
 * detection to individual rule modules in rules/.
 * @module plugins/python
 */

import { IPlugin, IConnection } from '../../extension/src/core/plugins';
import { PathResolver, IPythonPathResolverConfig } from './PathResolver';
import manifest from '../codegraphy.json';

// Rule detect functions
import { detect as detectStandardImport } from './rules/standard-import';
import { detect as detectFromImport } from './rules/from-import';

export { PathResolver } from './PathResolver';
export type { IPythonPathResolverConfig, IDetectedImport } from './PathResolver';

/**
 * Built-in plugin for Python files.
 *
 * Uses regex-based parsing to detect Python imports,
 * then resolves them to file paths using Python module resolution rules.
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
      const config = await loadPythonConfig(workspaceRoot);
      resolver = new PathResolver(workspaceRoot, config);
      console.log('[CodeGraphy] Python plugin initialized');
    },

    async detectConnections(
      filePath: string,
      content: string,
      workspaceRoot: string
    ): Promise<IConnection[]> {
      if (!resolver) {
        const config = await loadPythonConfig(workspaceRoot);
        resolver = new PathResolver(workspaceRoot, config);
      }

      const ctx = { resolver };

      return [
        ...detectStandardImport(content, filePath, ctx),
        ...detectFromImport(content, filePath, ctx),
      ];
    },

    onUnload(): void {
      resolver = null;
    },
  };
}

/**
 * Loads Python project configuration.
 * Looks for pyproject.toml, setup.cfg, or setup.py to determine source roots.
 */
async function loadPythonConfig(_workspaceRoot: string): Promise<IPythonPathResolverConfig> {
  // For now, use default config
  // Future: parse pyproject.toml for tool.setuptools.packages, etc.
  return {
    sourceRoots: [],
    resolveInitFiles: true,
  };
}

// Default export for convenience
export default createPythonPlugin;
