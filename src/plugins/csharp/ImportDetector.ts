/**
 * @fileoverview C# using statement detection using regex patterns.
 * Parses C# source files to extract all using directives.
 * @module plugins/csharp/ImportDetector
 */

/**
 * Represents a detected using directive in a C# source file.
 */
export interface IDetectedUsing {
  /** The namespace being imported (e.g., 'System.Collections.Generic') */
  namespace: string;
  /** Alias if using alias directive (e.g., 'using Foo = Bar.Baz;') */
  alias?: string;
  /** Whether this is a 'using static' directive */
  isStatic: boolean;
  /** Whether this is a 'global using' directive (C# 10+) */
  isGlobal: boolean;
  /** Line number where the using appears (1-indexed) */
  line: number;
  /** Types from this namespace that are actually used in the file */
  usedTypes?: string[];
}

/**
 * Represents a detected namespace declaration.
 */
export interface IDetectedNamespace {
  /** The namespace name */
  name: string;
  /** Line number where it appears */
  line: number;
  /** Whether it's file-scoped (C# 10+) */
  isFileScoped: boolean;
}

/**
 * Detects using directives and namespace declarations in C# source code.
 * 
 * Supports:
 * - `using System;`
 * - `using System.Collections.Generic;`
 * - `using static System.Math;`
 * - `using Alias = Namespace.Type;`
 * - `global using System;` (C# 10+)
 * - `namespace Foo.Bar { }` (block-scoped)
 * - `namespace Foo.Bar;` (file-scoped, C# 10+)
 * 
 * @example
 * ```typescript
 * const detector = new ImportDetector();
 * const result = detector.detect(`
 *   using System;
 *   using static System.Console;
 *   using Json = Newtonsoft.Json;
 *   
 *   namespace MyApp.Services;
 * `);
 * ```
 */
export class ImportDetector {
  /**
   * Detects all using directives and namespaces in C# source code.
   */
  detect(content: string, _fileName = 'file.cs'): { 
    usings: IDetectedUsing[];
    namespaces: IDetectedNamespace[];
  } {
    const usings: IDetectedUsing[] = [];
    const namespaces: IDetectedNamespace[] = [];
    
    const lines = content.split('\n');
    let inMultiLineComment = false;
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      const lineNum = i + 1;
      
      // Handle multi-line comments
      if (inMultiLineComment) {
        const endIdx = line.indexOf('*/');
        if (endIdx !== -1) {
          inMultiLineComment = false;
          line = line.substring(endIdx + 2);
        } else {
          continue;
        }
      }
      
      // Remove multi-line comment starts
      const commentStartIdx = line.indexOf('/*');
      if (commentStartIdx !== -1) {
        const commentEndIdx = line.indexOf('*/', commentStartIdx + 2);
        if (commentEndIdx !== -1) {
          line = line.substring(0, commentStartIdx) + line.substring(commentEndIdx + 2);
        } else {
          inMultiLineComment = true;
          line = line.substring(0, commentStartIdx);
        }
      }
      
      // Remove single-line comments
      const singleCommentIdx = line.indexOf('//');
      if (singleCommentIdx !== -1) {
        line = line.substring(0, singleCommentIdx);
      }
      
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Detect using directives
      const usingMatch = this._parseUsingDirective(trimmed);
      if (usingMatch) {
        usings.push({ ...usingMatch, line: lineNum });
        continue;
      }
      
      // Detect namespace declarations
      const nsMatch = this._parseNamespaceDeclaration(trimmed);
      if (nsMatch) {
        namespaces.push({ ...nsMatch, line: lineNum });
      }
    }
    
    return { usings, namespaces };
  }

  /**
   * Parses a using directive from a line.
   */
  private _parseUsingDirective(line: string): Omit<IDetectedUsing, 'line'> | null {
    // Match: [global] using [static] [Alias =] Namespace;
    const usingRegex = /^(global\s+)?using\s+(static\s+)?(?:(\w+)\s*=\s*)?([\w.]+)\s*;/;
    const match = line.match(usingRegex);
    
    if (!match) return null;
    
    return {
      namespace: match[4],
      alias: match[3] || undefined,
      isStatic: !!match[2],
      isGlobal: !!match[1],
    };
  }

  /**
   * Parses a namespace declaration from a line.
   */
  private _parseNamespaceDeclaration(line: string): Omit<IDetectedNamespace, 'line'> | null {
    // File-scoped: namespace Foo.Bar;
    const fileScopedMatch = line.match(/^namespace\s+([\w.]+)\s*;/);
    if (fileScopedMatch) {
      return {
        name: fileScopedMatch[1],
        isFileScoped: true,
      };
    }
    
    // Block-scoped: namespace Foo.Bar {
    const blockScopedMatch = line.match(/^namespace\s+([\w.]+)\s*\{?/);
    if (blockScopedMatch) {
      return {
        name: blockScopedMatch[1],
        isFileScoped: false,
      };
    }
    
    return null;
  }
}
