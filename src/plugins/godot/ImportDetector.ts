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
export type GDScriptReferenceType = 'preload' | 'load' | 'extends' | 'class_name' | 'class_name_usage';

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
   * Detect potential class_name usages in a single line.
   * Called separately by the plugin (not from detect()) so it can filter results
   * against the pre-built class_name map before storing connections.
   */
  detectClassNameUsagesInLine(line: string, lineNumber: number): IGDScriptReference[] {
    return this.detectClassNameUsages(line, lineNumber);
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
   * Ignores: extends Node2D (built-in classes, handled by detectClassNameUsages)
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
   * Detect usages of class names defined via `class_name` in other files.
   *
   * Covers the most common patterns in GDScript:
   *   - extends ClassName           (unquoted — by class_name)
   *   - var x: ClassName            (type annotation)
   *   - const X: ClassName          (type annotation)
   *   - @export var x: ClassName    (exported property)
   *   - func f(p: ClassName)        (parameter type)
   *   - func f() -> ClassName       (return type)
   *   - ClassName.something         (static / constructor access)
   *
   * Only identifiers that start with an uppercase letter are considered,
   * matching GDScript's class_name convention and reducing false positives.
   * The resolver will silently discard any name not in its class_name map.
   */
  detectClassNameUsages(line: string, lineNumber: number): IGDScriptReference[] {
    const references: IGDScriptReference[] = [];
    const seen = new Set<string>();

    const push = (name: string) => {
      if (!seen.has(name)) {
        seen.add(name);
        references.push({
          resPath: name,
          referenceType: 'class_name_usage',
          importType: 'static',
          line: lineNumber,
          isDeclaration: false,
        });
      }
    };

    const trimmed = line.trim();

    // extends ClassName  (no quotes — class_name-based inheritance)
    const extendsMatch = trimmed.match(/^extends\s+([A-Z]\w*)\s*(?:#.*)?$/);
    if (extendsMatch) {
      push(extendsMatch[1]);
    }

    // Type annotations: var/const/@export var/@onready var name: ClassName
    // Also catches function parameters: func f(p: ClassName)
    const typeAnnotationRegex = /\w+\s*:\s*([A-Z]\w*)/g;
    let match;
    while ((match = typeAnnotationRegex.exec(line)) !== null) {
      push(match[1]);
    }

    // Return type: -> ClassName
    const returnTypeMatch = line.match(/->\s*([A-Z]\w*)/);
    if (returnTypeMatch) {
      push(returnTypeMatch[1]);
    }

    // Static / constructor access: ClassName.something or ClassName.new()
    const staticAccessRegex = /\b([A-Z]\w*)\s*\./g;
    while ((match = staticAccessRegex.exec(line)) !== null) {
      push(match[1]);
    }

    // Type-check and cast: if x is ClassName / x as ClassName
    const isAsRegex = /\b(?:is|as)\s+([A-Z]\w*)/g;
    while ((match = isAsRegex.exec(line)) !== null) {
      push(match[1]);
    }

    return references;
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
