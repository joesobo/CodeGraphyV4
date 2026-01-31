/**
 * @fileoverview TypeScript/JavaScript plugin for CodeGraphy.
 * Detects imports in TS/JS files and resolves them to file paths.
 * @module plugins/typescript
 */

import * as fs from 'fs';
import * as path from 'path';
import { IPlugin, IConnection } from '../../core/plugins';
import { ImportDetector } from './ImportDetector';
import { PathResolver, IPathResolverConfig } from './PathResolver';

export { ImportDetector, IDetectedImport } from './ImportDetector';
export { PathResolver, IPathResolverConfig } from './PathResolver';

/**
 * Built-in plugin for TypeScript and JavaScript files.
 * 
 * Uses the TypeScript Compiler API to accurately detect imports,
 * then resolves them to file paths using tsconfig settings.
 * 
 * Supports:
 * - TypeScript (.ts, .tsx)
 * - JavaScript (.js, .jsx, .mjs, .cjs)
 * - ES6 imports, CommonJS require, dynamic imports
 * - tsconfig.json paths and baseUrl
 * - Index file resolution
 * - Extension inference
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
  let detector: ImportDetector | null = null;

  return {
    id: 'codegraphy.typescript',
    name: 'TypeScript/JavaScript',
    version: '1.0.0',
    supportedExtensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],

    async initialize(workspaceRoot: string): Promise<void> {
      detector = new ImportDetector();
      
      // Load tsconfig.json if it exists
      const config = loadTsConfig(workspaceRoot);
      resolver = new PathResolver(workspaceRoot, config);
      
      console.log('[CodeGraphy] TypeScript plugin initialized');
    },

    async detectConnections(
      filePath: string,
      content: string,
      workspaceRoot: string
    ): Promise<IConnection[]> {
      if (!detector || !resolver) {
        // Initialize if not already done
        detector = new ImportDetector();
        const config = loadTsConfig(workspaceRoot);
        resolver = new PathResolver(workspaceRoot, config);
      }

      const imports = detector.detect(content, filePath);
      const connections: IConnection[] = [];

      for (const imp of imports) {
        const resolvedPath = resolver.resolve(imp.specifier, filePath);
        
        connections.push({
          specifier: imp.specifier,
          resolvedPath,
          type: imp.type,
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
