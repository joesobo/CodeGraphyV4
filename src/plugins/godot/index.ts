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
import type { IPlugin, IConnection } from '../../core/plugins/types';
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

    for (const ref of rawReferences) {
      // Skip class_name declarations (they're not imports)
      if (ref.isDeclaration) {
        // Register the class_name for other files to reference
        this.resolver.registerClassName(ref.resPath, relativeFilePath);
        continue;
      }

      // Resolve the path
      const resolvedRelative = this.resolver.resolve(ref.resPath, relativeFilePath);
      
      if (resolvedRelative) {
        // Convert back to absolute path
        const resolvedAbsolute = path.join(workspaceRoot, resolvedRelative).replace(/\\/g, '/');
        connections.push({
          specifier: ref.resPath,
          resolvedPath: resolvedAbsolute,
          type: ref.importType,
        });
      } else {
        // Keep unresolved (might be user:// or class_name ref)
        connections.push({
          specifier: ref.resPath,
          resolvedPath: null,
          type: ref.importType,
        });
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
