/**
 * Godot GDScript Language Plugin
 * 
 * Analyzes GDScript (.gd) files to detect dependencies:
 * - preload() calls (compile-time loading)
 * - load() calls (runtime loading)
 * - extends statements (script inheritance)
 * - class_name declarations
 */

import * as path from 'path';
import type { IPlugin, IConnection, IRule } from '../../core/plugins/types';
import { GDScriptImportDetector } from './ImportDetector';
import { GDScriptPathResolver } from './PathResolver';

/**
 * GDScript language plugin for CodeGraphy.
 * 
 * Detects dependencies in Godot GDScript files and resolves
 * resource paths (res://) to workspace-relative paths.
 */
export class GDScriptPlugin implements IPlugin {
  readonly id = 'codegraphy.gdscript';
  readonly name = 'GDScript (Godot)';
  readonly version = '1.0.0';
  readonly supportedExtensions = ['.gd'];
  
  // Plugin-preferred colors for Godot file types
  readonly fileColors: Record<string, string> = {
    '.gd': '#478CBF',       // Godot blue
    '.tscn': '#6EE7B7',     // Soft emerald - scenes
    '.tres': '#5EEAD4',     // Soft teal - resources
    '.gdshader': '#A78BFA', // Soft purple - shaders
    'project.godot': '#478CBF', // Godot blue
  };

  /**
   * Default exclude patterns for Godot projects.
   * These are merged with user settings.
   */
  readonly defaultExclude = [
    '**/.godot/**',
    '**/.import/**',
    '**/*.import',
    '**/.mono/**',
    '**/addons/**',
  ];

  readonly defaultFilterPatterns = [
    '**/*.uid', // Godot 4 resource UID files (auto-generated, rarely useful in graph)
  ];

  readonly rules: IRule[] = [
    { id: 'preload', name: 'Preload', description: 'preload("res://...")' },
    { id: 'load', name: 'Load', description: 'load(), ResourceLoader.load()' },
    { id: 'extends', name: 'Extends', description: 'extends "res://..." or ClassName' },
    { id: 'class-name-usage', name: 'Class Name Usage', description: 'Type annotations, static calls' },
  ];

  private detector: GDScriptImportDetector;
  private resolver: GDScriptPathResolver | null = null;
  constructor() {
    this.detector = new GDScriptImportDetector();
  }

  /**
   * Initialize the plugin.
   * @param workspaceRoot - Absolute path to workspace root
   */
  async initialize(workspaceRoot: string): Promise<void> {
    this.resolver = new GDScriptPathResolver(workspaceRoot);
    console.log('[CodeGraphy] GDScript plugin initialized');
  }

  /**
   * Pre-analysis pass: scan all .gd files to build the class_name → file map.
   *
   * This must run before per-file detectConnections calls because:
   * 1. Files may be processed in any order — global.gd before round_manager.gd.
   * 2. Cached files skip detectConnections, so their class_names would never register.
   *
   * After this call, resolver.resolve("RoundManager") returns the correct file path.
   */
  async preAnalyze(
    files: Array<{ absolutePath: string; relativePath: string; content: string }>,
    workspaceRoot: string
  ): Promise<void> {
    if (!this.resolver) {
      this.resolver = new GDScriptPathResolver(workspaceRoot);
    }

    // Rebuild map from scratch on every analysis run to stay consistent
    this.resolver.clearClassNames();

    for (const { relativePath, content } of files) {
      // Register file for snake_case fallback resolution
      this.resolver.registerFile(relativePath);

      // Register explicit class_name declarations
      const refs = this.detector.detect(content);
      for (const ref of refs) {
        if (ref.isDeclaration) {
          this.resolver.registerClassName(ref.resPath, relativePath);
        }
      }
    }

    console.log(`[CodeGraphy] GDScript class_name map: ${this.resolver.getClassNameMap().size} entries, ${this.resolver.getFileNameMap().size} files indexed`);
  }

  /**
   * Detect connections in a GDScript file.
   * 
   * @param filePath - Absolute path to the file
   * @param content - File contents
   * @param workspaceRoot - Absolute path to workspace root
   * @returns Array of detected connections with resolved paths
   */
  async detectConnections(
    filePath: string,
    content: string,
    workspaceRoot: string
  ): Promise<IConnection[]> {
    // Ensure resolver is initialized
    if (!this.resolver) {
      this.resolver = new GDScriptPathResolver(workspaceRoot);
    }

    const rawReferences = this.detector.detect(content);
    const connections: IConnection[] = [];

    // Get workspace-relative path for the current file
    const relativeFilePath = path.relative(workspaceRoot, filePath).replace(/\\/g, '/');

    // Map GDScript reference types to rule IDs
    const ruleIdMap: Record<string, string> = {
      'preload': 'preload',
      'load': 'load',
      'extends': 'extends',
      'class_name_usage': 'class-name-usage',
    };

    for (const ref of rawReferences) {
      // Skip class_name declarations (they're not imports)
      if (ref.isDeclaration) {
        // Re-register in case preAnalyze wasn't called (e.g. unit tests)
        this.resolver.registerClassName(ref.resPath, relativeFilePath);
        continue;
      }

      // Resolve the path
      const resolvedRelative = this.resolver.resolve(ref.resPath, relativeFilePath);

      if (resolvedRelative) {
        const resolvedAbsolute = path.join(workspaceRoot, resolvedRelative).replace(/\\/g, '/');
        connections.push({
          specifier: ref.resPath,
          resolvedPath: resolvedAbsolute,
          type: ref.importType,
          ruleId: ruleIdMap[ref.referenceType] ?? 'preload',
        });
      } else {
        // Keep unresolved res:// / user:// paths as-is (external or user data).
        connections.push({
          specifier: ref.resPath,
          resolvedPath: null,
          type: ref.importType,
          ruleId: ruleIdMap[ref.referenceType] ?? 'preload',
        });
      }
    }

    // Detect class_name usages (type annotations, extends by name, static calls).
    // These are checked separately against the class_name map; unresolved hits are
    // silently dropped (they're just false positives from the uppercase heuristic).
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const lineWithoutComment = lines[i].split('#')[0];
      if (!lineWithoutComment.trim()) continue;

      const usageRefs = this.detector.detectClassNameUsagesInLine(lineWithoutComment, i + 1);
      for (const ref of usageRefs) {
        const resolvedRelative = this.resolver.resolve(ref.resPath, relativeFilePath);
        if (resolvedRelative) {
          const resolvedAbsolute = path.join(workspaceRoot, resolvedRelative).replace(/\\/g, '/');
          connections.push({
            specifier: ref.resPath,
            resolvedPath: resolvedAbsolute,
            type: ref.importType,
            ruleId: 'class-name-usage',
          });
        }
        // Unresolved class_name_usage = built-in Godot type or false positive, discard.
      }
    }

    return connections;
  }

  /**
   * Clean up plugin resources.
   */
  dispose(): void {
    this.resolver?.clearClassNames();
    this.resolver = null;
  }
}

/**
 * Factory function to create a GDScript plugin instance.
 */
export function createGDScriptPlugin(): IPlugin {
  return new GDScriptPlugin();
}

// Re-export components for direct use
export { GDScriptImportDetector, GDScriptPathResolver };
export type { IGDScriptReference } from './ImportDetector';
