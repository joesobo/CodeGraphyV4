/**
 * GDScript Path Resolver
 * 
 * Resolves Godot resource paths (res://) to workspace-relative paths.
 * Also handles class_name lookups for global script references.
 */

import * as path from 'path';

/**
 * Resolves Godot resource paths to workspace-relative file paths.
 * 
 * @example
 * ```typescript
 * const resolver = new GDScriptPathResolver('/workspace/my-game');
 * const resolved = resolver.resolve('res://scripts/player.gd', 'scenes/main.gd');
 * // Returns: 'scripts/player.gd'
 * ```
 */
export class GDScriptPathResolver {
  private classNameMap: Map<string, string> = new Map();

  /**
   * Create a new path resolver.
   * 
   * @param _workspaceRoot - Absolute path to the workspace/project root (reserved for future use)
   */
  constructor(_workspaceRoot: string) {
    // workspaceRoot reserved for future features like absolute path validation
  }

  /**
   * Register a class_name declaration for reverse lookups.
   * 
   * @param className - The declared class name (e.g., "Player")
   * @param filePath - The workspace-relative path to the file
   */
  registerClassName(className: string, filePath: string): void {
    this.classNameMap.set(className, filePath);
  }

  /**
   * Clear all registered class names.
   */
  clearClassNames(): void {
    this.classNameMap.clear();
  }

  /**
   * Resolve a Godot resource path to a workspace-relative path.
   * 
   * @param importPath - The import path (e.g., "res://scripts/player.gd")
   * @param fromFile - The file containing the import (workspace-relative)
   * @returns Resolved workspace-relative path, or null if cannot resolve
   */
  resolve(importPath: string, fromFile: string): string | null {
    // Handle res:// paths
    if (importPath.startsWith('res://')) {
      return this.resolveResPath(importPath);
    }

    // Handle user:// paths (user data directory - can't resolve to workspace)
    if (importPath.startsWith('user://')) {
      return null;
    }

    // Handle class_name references
    if (this.classNameMap.has(importPath)) {
      return this.classNameMap.get(importPath) || null;
    }

    // Handle relative paths (rare in GDScript, but possible)
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      return this.resolveRelativePath(importPath, fromFile);
    }

    return null;
  }

  /**
   * Resolve a res:// path to workspace-relative path.
   */
  private resolveResPath(resPath: string): string {
    // res://path/to/file.gd -> path/to/file.gd
    // The res:// prefix refers to the project root
    const relativePath = resPath.slice('res://'.length);
    
    // Normalize path separators
    return relativePath.replace(/\\/g, '/');
  }

  /**
   * Resolve a relative path.
   */
  private resolveRelativePath(importPath: string, fromFile: string): string {
    const fromDir = path.dirname(fromFile);
    const resolved = path.join(fromDir, importPath);
    
    // Normalize to forward slashes
    return resolved.replace(/\\/g, '/');
  }

  /**
   * Get all registered class names and their file paths.
   */
  getClassNameMap(): Map<string, string> {
    return new Map(this.classNameMap);
  }

  /**
   * Check if a path looks like it could be a Godot resource.
   */
  static isGodotResource(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return [
      '.gd',      // GDScript
      '.tscn',    // Scene
      '.tres',    // Resource
      '.gdshader', // Shader
      '.gdns',    // NativeScript
      '.gdnlib',  // NativeScript library
    ].includes(ext);
  }

  /**
   * Get the file extensions this resolver handles.
   */
  static getSupportedExtensions(): string[] {
    return ['.gd', '.tscn', '.tres', '.gdshader'];
  }
}
