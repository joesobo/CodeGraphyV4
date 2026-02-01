/**
 * @fileoverview Python plugin for CodeGraphy.
 * Detects imports in Python files and resolves them to file paths.
 * @module plugins/python
 */

import { IPlugin, IConnection } from '../../core/plugins';
import { ImportDetector } from './ImportDetector';
import { PathResolver, IPythonPathResolverConfig } from './PathResolver';

export { ImportDetector } from './ImportDetector';
export type { IDetectedImport } from './ImportDetector';
export { PathResolver } from './PathResolver';
export type { IPythonPathResolverConfig } from './PathResolver';

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
  let detector: ImportDetector | null = null;

  return {
    id: 'codegraphy.python',
    name: 'Python',
    version: '1.0.0',
    supportedExtensions: ['.py', '.pyi'],
    
    // Default excludes for Python projects
    defaultExclude: [
      'venv',
      '.venv',
      'env',
      '.env',
      '__pycache__',
      '.pytest_cache',
      '.mypy_cache',
      '.tox',
      'eggs',
      '*.egg-info',
      'dist',
      'build',
      '.eggs',
    ],
    
    // Plugin-preferred colors for Python files
    fileColors: {
      '.py': '#3776AB',         // Python blue
      '.pyi': '#3776AB',        // Type stubs - same blue
      '__init__.py': '#FFD43B', // Package init - Python yellow
      'setup.py': '#FFD43B',    // Setup script - Python yellow
      'pyproject.toml': '#FFD43B',
      'requirements.txt': '#3776AB',
      'requirements-dev.txt': '#3776AB',
      'Pipfile': '#3776AB',
      'poetry.lock': '#3776AB',
      '.flake8': '#4B8BBE',     // Linter config
      '.pylintrc': '#4B8BBE',
      'pytest.ini': '#009688',  // pytest teal
      'conftest.py': '#009688',
      'tox.ini': '#4B8BBE',
      'mypy.ini': '#4B8BBE',
      '.pre-commit-config.yaml': '#FAB040',
    },

    async initialize(workspaceRoot: string): Promise<void> {
      detector = new ImportDetector();
      
      // Load Python project config if available
      const config = await loadPythonConfig(workspaceRoot);
      resolver = new PathResolver(workspaceRoot, config);
      
      console.log('[CodeGraphy] Python plugin initialized');
    },

    async detectConnections(
      filePath: string,
      content: string,
      workspaceRoot: string
    ): Promise<IConnection[]> {
      if (!detector || !resolver) {
        // Initialize if not already done
        detector = new ImportDetector();
        const config = await loadPythonConfig(workspaceRoot);
        resolver = new PathResolver(workspaceRoot, config);
      }

      const imports = detector.detect(content, filePath);
      const connections: IConnection[] = [];

      for (const imp of imports) {
        const resolvedPath = resolver.resolve(imp, filePath);
        
        // Build the specifier string for display
        let specifier = imp.isRelative 
          ? '.'.repeat(imp.relativeLevel) + (imp.module || '')
          : imp.module;
        
        if (imp.names && imp.names.length > 0) {
          specifier = `from ${specifier} import ${imp.names.join(', ')}`;
        }
        
        connections.push({
          specifier,
          resolvedPath,
          type: imp.type === 'from' ? 'static' : 'static',
        });
      }

      return connections;
    },

    dispose(): void {
      resolver = null;
      detector = null;
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
