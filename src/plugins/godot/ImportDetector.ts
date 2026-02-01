/**
 * GDScript Import Detector
 * 
 * Detects dependencies in GDScript files by parsing:
 * - preload("res://...") calls (compile-time loading)
 * - load("res://...") calls (runtime loading)
 * - extends "res://..." statements (script inheritance)
 * - class_name declarations (for reverse lookup)
 */

/** Types of GDScript references */
export type GDScriptReferenceType = 'preload' | 'load' | 'extends' | 'class_name';

/** Raw detected reference from GDScript */
export interface IGDScriptReference {
  /** The resource path as written (e.g., "res://scripts/player.gd") */
  resPath: string;
  /** Type of reference */
  referenceType: GDScriptReferenceType;
  /** Import type for the connection */
  importType: 'static' | 'dynamic';
  /** Line number (1-indexed) */
  line: number;
  /** Whether this is a class_name declaration (not an import) */
  isDeclaration?: boolean;
}

/**
 * Detects dependencies in GDScript source code.
 * 
 * @example
 * ```typescript
 * const detector = new GDScriptImportDetector();
 * const refs = detector.detect(gdscriptCode);
 * // Returns: [{ resPath: 'res://scenes/player.gd', referenceType: 'preload', ... }]
 * ```
 */
export class GDScriptImportDetector {
  /**
   * Detect all dependencies in GDScript source code.
   * 
   * @param content - GDScript source code
   * @returns Array of detected references
   */
  detect(content: string): IGDScriptReference[] {
    const references: IGDScriptReference[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Skip comments
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('#')) {
        continue;
      }

      // Remove inline comments for parsing
      const lineWithoutComment = line.split('#')[0];

      // Detect preload() calls
      const preloadRefs = this.detectPreload(lineWithoutComment, lineNumber);
      references.push(...preloadRefs);

      // Detect load() calls
      const loadRefs = this.detectLoad(lineWithoutComment, lineNumber);
      references.push(...loadRefs);

      // Detect extends statements
      const extendsRef = this.detectExtends(lineWithoutComment, lineNumber);
      if (extendsRef) {
        references.push(extendsRef);
      }

      // Detect class_name declarations
      const classNameRef = this.detectClassName(lineWithoutComment, lineNumber);
      if (classNameRef) {
        references.push(classNameRef);
      }
    }

    return references;
  }

  /**
   * Detect preload() calls.
   * Matches: preload("res://path/to/file.gd")
   */
  private detectPreload(line: string, lineNumber: number): IGDScriptReference[] {
    const references: IGDScriptReference[] = [];
    
    // Match preload("...") or preload('...')
    const regex = /preload\s*\(\s*["']([^"']+)["']\s*\)/g;
    let match;

    while ((match = regex.exec(line)) !== null) {
      const resPath = match[1];
      if (this.isResPath(resPath)) {
        references.push({
          resPath: resPath,
          referenceType: 'preload',
          importType: 'static',
          line: lineNumber,
        });
      }
    }

    return references;
  }

  /**
   * Detect load() calls.
   * Matches: load("res://path/to/file.tscn")
   * Does NOT match: preload() (handled separately)
   */
  private detectLoad(line: string, lineNumber: number): IGDScriptReference[] {
    const references: IGDScriptReference[] = [];
    
    // Match load("...") or load('...')
    // Also match ResourceLoader.load("...")
    // Use negative lookbehind to avoid matching preload
    const regex = /(?<!pre)(?:ResourceLoader\.)?load\s*\(\s*["']([^"']+)["']\s*\)/g;
    let match;

    while ((match = regex.exec(line)) !== null) {
      const resPath = match[1];
      if (this.isResPath(resPath)) {
        references.push({
          resPath: resPath,
          referenceType: 'load',
          importType: 'dynamic',
          line: lineNumber,
        });
      }
    }

    return references;
  }

  /**
   * Detect extends statements with file paths.
   * Matches: extends "res://scripts/base.gd"
   * Ignores: extends Node2D (built-in classes)
   */
  private detectExtends(line: string, lineNumber: number): IGDScriptReference | null {
    // Match extends "..." or extends '...'
    const regex = /^extends\s+["']([^"']+)["']/;
    const match = line.trim().match(regex);

    if (match) {
      const resPath = match[1];
      if (this.isResPath(resPath)) {
        return {
          resPath: resPath,
          referenceType: 'extends',
          importType: 'static',
          line: lineNumber,
        };
      }
    }

    return null;
  }

  /**
   * Detect class_name declarations.
   * Matches: class_name Player
   * These are used for reverse lookup (finding what references this class).
   */
  private detectClassName(line: string, lineNumber: number): IGDScriptReference | null {
    // Match class_name ClassName
    const regex = /^class_name\s+(\w+)/;
    const match = line.trim().match(regex);

    if (match) {
      const className = match[1];
      return {
        resPath: className,
        referenceType: 'class_name',
        importType: 'static',
        line: lineNumber,
        isDeclaration: true,
      };
    }

    return null;
  }

  /**
   * Check if a path is a Godot resource path.
   */
  private isResPath(path: string): boolean {
    return path.startsWith('res://') || path.startsWith('user://');
  }
}
