/**
 * @fileoverview Python import detection using regex patterns.
 * Parses Python source files to extract all import statements.
 * @module plugins/python/ImportDetector
 */

/**
 * Represents a detected import in a Python source file.
 */
export interface IDetectedImport {
  /** The module name/path as written (e.g., 'os', 'mypackage.utils') */
  module: string;
  /** Items imported (for 'from x import y') */
  names?: string[];
  /** Whether this is a relative import (starts with .) */
  isRelative: boolean;
  /** Number of parent levels for relative imports (e.g., '..' = 2) */
  relativeLevel: number;
  /** The type of import statement */
  type: 'import' | 'from';
  /** Line number where the import appears (1-indexed) */
  line: number;
}

/**
 * Detects imports in Python source code using regex patterns.
 * 
 * Supports:
 * - `import module`
 * - `import module as alias`
 * - `import module1, module2`
 * - `from module import name`
 * - `from module import name as alias`
 * - `from module import name1, name2`
 * - `from module import *`
 * - `from . import name` (relative imports)
 * - `from .. import name` (parent relative imports)
 * - `from ..module import name` (parent module imports)
 * - Multi-line imports with parentheses
 * 
 * @example
 * ```typescript
 * const detector = new ImportDetector();
 * const imports = detector.detect(`
 *   import os
 *   from pathlib import Path
 *   from . import utils
 *   from ..helpers import helper_func
 * `);
 * ```
 */
export class ImportDetector {
  /**
   * Detects all imports in the given Python source code.
   * 
   * @param content - The Python source code to analyze
   * @param _fileName - Optional file name (unused but kept for interface consistency)
   * @returns Array of detected imports
   */
  detect(content: string, _fileName = 'file.py'): IDetectedImport[] {
    const imports: IDetectedImport[] = [];

    // Preprocess: handle multi-line imports by joining lines within parentheses
    const processedContent = this._preprocessMultilineImports(content);
    
    // Split into lines for processing
    const processedLines = processedContent.split('\n');

    // Track which original line each processed line came from
    const lineMapping = this._createLineMapping(content, processedContent);

    // Detect `import module` statements
    for (let i = 0; i < processedLines.length; i++) {
      const line = processedLines[i];
      const trimmedLine = line.trim();
      
      // Skip comments and strings
      if (this._isInCommentOrString(trimmedLine)) {
        continue;
      }

      // Match `import module` pattern
      const importMatch = trimmedLine.match(/^import\s+([\w.,\s]+)/);
      if (importMatch) {
        const modules = importMatch[1].split(',').map(m => m.trim().split(/\s+as\s+/)[0]);
        for (const module of modules) {
          if (module && !module.includes(' ')) {
            imports.push({
              module,
              isRelative: false,
              relativeLevel: 0,
              type: 'import',
              line: lineMapping[i] + 1,
            });
          }
        }
      }

      // Match `from module import name` pattern
      const fromMatch = trimmedLine.match(/^from\s+(\.*)(\w[\w.]*|)\s+import\s+(.+)/);
      if (fromMatch) {
        const dots = fromMatch[1];
        const module = fromMatch[2] || '';
        const namesStr = fromMatch[3];
        
        // Parse imported names (handle parentheses, asterisk, etc.)
        const names = this._parseImportedNames(namesStr);
        
        imports.push({
          module,
          names: names.length > 0 ? names : undefined,
          isRelative: dots.length > 0,
          relativeLevel: dots.length,
          type: 'from',
          line: lineMapping[i] + 1,
        });
      }
    }

    return imports;
  }

  /**
   * Preprocesses content to join multi-line imports.
   * Handles imports that span multiple lines using parentheses.
   */
  private _preprocessMultilineImports(content: string): string {
    const lines = content.split('\n');
    const result: string[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      
      // Check if this line starts an import with opening parenthesis
      if (/^(from\s+|import\s+).*\($/.test(line.trim()) || 
          /^(from\s+|import\s+).*\([^)]*$/.test(line.trim())) {
        // Collect lines until closing parenthesis
        let combined = line;
        i++;
        while (i < lines.length && !combined.includes(')')) {
          combined += ' ' + lines[i].trim();
          i++;
        }
        // Remove parentheses and normalize whitespace
        combined = combined.replace(/\(\s*/g, '').replace(/\s*\)/g, '');
        result.push(combined);
      } else {
        result.push(line);
        i++;
      }
    }

    return result.join('\n');
  }

  /**
   * Creates a mapping from processed line indices to original line numbers.
   */
  private _createLineMapping(original: string, processed: string): number[] {
    const originalLines = original.split('\n');
    const processedLines = processed.split('\n');
    const mapping: number[] = [];
    
    let origIdx = 0;
    for (let procIdx = 0; procIdx < processedLines.length; procIdx++) {
      mapping.push(origIdx);
      
      // If this line was from a multi-line import, skip the consumed original lines
      const procLine = processedLines[procIdx];
      if (procLine.includes(',') && originalLines[origIdx]?.includes('(')) {
        // Count how many original lines this consumed
        while (origIdx < originalLines.length && !originalLines[origIdx].includes(')')) {
          origIdx++;
        }
      }
      origIdx++;
    }

    return mapping;
  }

  /**
   * Checks if a line is a comment or inside a string.
   */
  private _isInCommentOrString(line: string): boolean {
    const trimmed = line.trim();
    // Simple check for comment lines
    return trimmed.startsWith('#') || trimmed.startsWith('"""') || trimmed.startsWith("'''");
  }

  /**
   * Parses the imported names from a `from x import y, z` statement.
   */
  private _parseImportedNames(namesStr: string): string[] {
    // Remove any trailing comments
    const withoutComment = namesStr.split('#')[0].trim();
    
    // Handle wildcard
    if (withoutComment === '*') {
      return ['*'];
    }

    // Remove parentheses if present
    const cleaned = withoutComment.replace(/[()]/g, '');
    
    // Split by comma and extract names (handle 'as' aliases)
    const names = cleaned
      .split(',')
      .map(n => n.trim().split(/\s+as\s+/)[0].trim())
      .filter(n => n.length > 0);

    return names;
  }
}
