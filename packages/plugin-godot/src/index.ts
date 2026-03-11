/**
 * @fileoverview GDScript (Godot) plugin for CodeGraphy.
 * Thin orchestrator that loads metadata from codegraphy.json and delegates
 * detection to individual rule modules in rules/.
 * @module plugins/godot
 */

import * as path from 'path';
import type { IPlugin, IConnection } from '@codegraphy/plugin-api';
import { GDScriptPathResolver } from './PathResolver';
import { detectClassNameDeclaration } from './parser';
import manifest from '../codegraphy.json';

// Rule detect functions
import { detect as detectPreload } from './rules/preload';
import { detect as detectLoad } from './rules/load';
import { detect as detectExtends } from './rules/extends';
import { detect as detectClassNameUsage } from './rules/class-name-usage';

export { GDScriptPathResolver } from './PathResolver';
export type { IGDScriptReference, GDScriptReferenceType } from './parser';

/**
 * Built-in plugin for GDScript (Godot) files.
 *
 * Detects dependencies in Godot GDScript files and resolves
 * resource paths (res://) to workspace-relative paths.
 *
 * Supports:
 * - preload() calls (compile-time loading)
 * - load() calls (runtime loading)
 * - extends statements (script inheritance)
 * - class_name usage (type annotations, static calls)
 *
 * @example
 * ```typescript
 * import { createGDScriptPlugin } from './plugins/godot';
 *
 * const plugin = createGDScriptPlugin();
 * registry.register(plugin, { builtIn: true });
 * ```
 */
export function createGDScriptPlugin(): IPlugin {
  let resolver: GDScriptPathResolver | null = null;

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
      resolver = new GDScriptPathResolver(workspaceRoot);
      console.log('[CodeGraphy] GDScript plugin initialized');
    },

    async onPreAnalyze(
      files: Array<{ absolutePath: string; relativePath: string; content: string }>,
      workspaceRoot: string
    ): Promise<void> {
      if (!resolver) resolver = new GDScriptPathResolver(workspaceRoot);
      resolver.clearClassNames();

      for (const { relativePath, content } of files) {
        // Register file for snake_case fallback resolution
        resolver.registerFile(relativePath);

        // Register explicit class_name declarations
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const ref = detectClassNameDeclaration(lines[i], i + 1);
          if (ref) resolver.registerClassName(ref.resPath, relativePath);
        }
      }

      console.log(`[CodeGraphy] GDScript class_name map: ${resolver.getClassNameMap().size} entries, ${resolver.getFileNameMap().size} files indexed`);
    },

    async detectConnections(filePath: string, content: string, workspaceRoot: string): Promise<IConnection[]> {
      if (!resolver) resolver = new GDScriptPathResolver(workspaceRoot);

      const relativeFilePath = path.relative(workspaceRoot, filePath).replace(/\\/g, '/');
      const ctx = { resolver, workspaceRoot, relativeFilePath };

      // Register class_name declarations from this file (in case onPreAnalyze did not run yet)
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const ref = detectClassNameDeclaration(lines[i], i + 1);
        if (ref) resolver.registerClassName(ref.resPath, relativeFilePath);
      }

      return [
        ...detectPreload(content, filePath, ctx),
        ...detectLoad(content, filePath, ctx),
        ...detectExtends(content, filePath, ctx),
        ...detectClassNameUsage(content, filePath, ctx),
      ];
    },

    onUnload(): void {
      resolver?.clearClassNames();
      resolver = null;
    },
  };
}

// Default export for convenience
export default createGDScriptPlugin;
