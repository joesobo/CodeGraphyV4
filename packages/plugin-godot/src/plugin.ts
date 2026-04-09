/**
 * @fileoverview GDScript (Godot) plugin for CodeGraphy.
 * Thin orchestrator that loads metadata from codegraphy.json and delegates
 * detection to individual source modules in sources/.
 * @module plugins/godot
 */

import * as path from 'path';
import type { IPlugin } from '@codegraphy-vscode/plugin-api';
import { GDScriptPathResolver } from './PathResolver';
import { detectClassNameDeclaration, normalizePath } from './parser';
import {
  buildGDScriptFileAnalysisResult,
  type GDScriptFileAnalysisResult,
} from './analysis';
import manifest from '../codegraphy.json';

// Source detect functions
import { detect as detectPreload } from './sources/preload';
import { detect as detectLoad } from './sources/load';
import { detect as detectExtends } from './sources/extends';
import { detect as detectClassNameUsage } from './sources/class-name-usage';

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
export interface IGDScriptAnalyzeFilePlugin extends IPlugin {
  analyzeFile(
    filePath: string,
    content: string,
    workspaceRoot: string,
  ): Promise<GDScriptFileAnalysisResult>;
}

export function createGDScriptPlugin(): IGDScriptAnalyzeFilePlugin {
  let resolver: GDScriptPathResolver | null = null;

  const analyzeFile = async (
    filePath: string,
    content: string,
    workspaceRoot: string,
  ): Promise<GDScriptFileAnalysisResult> => {
    if (!resolver) resolver = new GDScriptPathResolver(workspaceRoot);

    const relativeFilePath = normalizePath(path.relative(workspaceRoot, filePath));
    const ctx = { resolver, workspaceRoot, relativeFilePath };

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const ref = detectClassNameDeclaration(lines[i], i + 1);
      if (ref) resolver.registerClassName(ref.resPath, relativeFilePath);
    }

    const connections = [
      ...detectPreload(content, filePath, ctx),
      ...detectLoad(content, filePath, ctx),
      ...detectExtends(content, filePath, ctx),
      ...detectClassNameUsage(content, filePath, ctx),
    ];

    return buildGDScriptFileAnalysisResult(filePath, connections);
  };

  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    apiVersion: manifest.apiVersion,
    supportedExtensions: manifest.supportedExtensions,
    defaultFilters: manifest.defaultFilters,
    sources: manifest.sources,
    fileColors: manifest.fileColors as IPlugin['fileColors'],

    async initialize(workspaceRoot: string): Promise<void> {
      resolver = new GDScriptPathResolver(workspaceRoot);
      console.log('[CodeGraphy] GDScript plugin initialized');
    },

    async onPreAnalyze(
      files: Array<{ absolutePath: string; relativePath: string; content: string }>,
      workspaceRoot: string
    ): Promise<void> {
      resolver = new GDScriptPathResolver(workspaceRoot);

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

    analyzeFile,

    onUnload(): void {
      resolver?.clearClassNames();
      resolver = null;
    },
  };
}

// Default export for convenience
export default createGDScriptPlugin;
