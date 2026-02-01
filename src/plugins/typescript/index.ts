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

export { ImportDetector } from './ImportDetector';
export type { IDetectedImport } from './ImportDetector';
export { PathResolver } from './PathResolver';
export type { IPathResolverConfig } from './PathResolver';

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
    
    // Plugin-preferred colors for file extensions and config files
    fileColors: {
      // TypeScript/JavaScript source files
      '.ts': '#3178C6',     // TypeScript blue
      '.tsx': '#61DAFB',    // React cyan
      '.js': '#F7DF1E',     // JavaScript yellow
      '.jsx': '#61DAFB',    // React cyan
      '.mjs': '#F7DF1E',    // JavaScript yellow
      '.cjs': '#F7DF1E',    // JavaScript yellow
      '.vue': '#42B883',    // Vue green 💚
      
      // Config files
      'tsconfig.json': '#3178C6',     // TypeScript blue
      'jsconfig.json': '#F7DF1E',     // JavaScript yellow
      'package.json': '#CB3837',      // npm red
      'package-lock.json': '#CB3837', // npm red
      '.npmrc': '#CB3837',            // npm red
      
      // Linting & formatting
      '.eslintrc': '#4B32C3',         // ESLint purple
      '.eslintrc.js': '#4B32C3',
      '.eslintrc.json': '#4B32C3',
      '.eslintrc.cjs': '#4B32C3',
      'eslint.config.js': '#4B32C3',
      'eslint.config.mjs': '#4B32C3',
      '.prettierrc': '#F7B93E',       // Prettier orange
      '.prettierrc.json': '#F7B93E',
      'prettier.config.js': '#F7B93E',
      
      // Build tools
      'vite.config.ts': '#646CFF',    // Vite purple
      'vite.config.js': '#646CFF',
      'webpack.config.js': '#8DD6F9', // Webpack blue
      'rollup.config.js': '#FF3333',  // Rollup red
      'esbuild.config.js': '#FFCF00', // esbuild yellow
      'nuxt.config.ts': '#00DC82',    // Nuxt green
      'nuxt.config.js': '#00DC82',
      
      // Testing
      'vitest.config.ts': '#729B1B',  // Vitest green
      'jest.config.js': '#C21325',    // Jest red
      '**/*.test.ts': '#729B1B',      // Test files green
      '**/*.test.tsx': '#729B1B',
      '**/*.spec.ts': '#729B1B',
      '**/*.spec.tsx': '#729B1B',
      
      // Git
      '.gitignore': '#F05032',        // Git orange
      '.gitattributes': '#F05032',
      
      // Environment & Docker
      '.env': '#ECD53F',              // Env yellow
      '.env.local': '#ECD53F',
      '.env.development': '#ECD53F',
      '.env.production': '#ECD53F',
      'Dockerfile': '#2496ED',        // Docker blue
      'docker-compose.yml': '#2496ED',
      
      // Documentation
      '.md': '#083FA1',               // Markdown blue
      'README.md': '#083FA1',
      'LICENSE': '#6B7280',           // Gray
    },

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
