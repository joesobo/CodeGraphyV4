/**
 * @fileoverview C# source parsing utilities.
 * Extracts using directives, namespace declarations, and type names from C# source code.
 * @module plugins/csharp/parser
 */

import type { PathResolver } from './PathResolver';

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
 * Shared context type for C# rules.
 * Computed once by the orchestrator and passed to all rule detectors.
 */
export interface CSharpRuleContext {
  resolver: PathResolver;
  usings: IDetectedUsing[];
  namespaces: IDetectedNamespace[];
  usedTypes: Set<string>;
}

/**
 * Parses a using directive from a line.
 */
function parseUsingDirective(line: string): Omit<IDetectedUsing, 'line'> | null {
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
function parseNamespaceDeclaration(line: string): Omit<IDetectedNamespace, 'line'> | null {
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

/**
 * Parses C# source code to extract using directives and namespace declarations.
 * Handles comment stripping (single-line and multi-line).
 */
export function parseContent(content: string): {
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
    const usingMatch = parseUsingDirective(trimmed);
    if (usingMatch) {
      usings.push({ ...usingMatch, line: lineNum });
      continue;
    }

    // Detect namespace declarations
    const nsMatch = parseNamespaceDeclaration(trimmed);
    if (nsMatch) {
      namespaces.push({ ...nsMatch, line: lineNum });
    }
  }

  return { usings, namespaces };
}

/**
 * Extracts type names that are actually used in C# code.
 * Looks for patterns like:
 * - new TypeName(...)
 * - TypeName.Method(...)
 * - TypeName.Property
 * - : TypeName (inheritance/implementation)
 * - TypeName variable
 * - <TypeName> (generics)
 */
export function extractUsedTypes(content: string): Set<string> {
  const types = new Set<string>();

  // Remove comments and strings to avoid false positives
  const cleanContent = content
    .replace(/\/\*[\s\S]*?\*\//g, '')  // Multi-line comments
    .replace(/\/\/.*/g, '')             // Single-line comments
    .replace(/"(?:[^"\\]|\\.)*"/g, '')  // Double-quoted strings
    .replace(/@"(?:[^"]|"")*"/g, '')    // Verbatim strings
    .replace(/'(?:[^'\\]|\\.)*'/g, ''); // Char literals

  // Pattern: new TypeName(
  const newPattern = /\bnew\s+([A-Z][A-Za-z0-9_]*)\s*[(<]/g;
  let match;
  while ((match = newPattern.exec(cleanContent)) !== null) {
    types.add(match[1]);
  }

  // Pattern: TypeName.Something (static access)
  const staticPattern = /\b([A-Z][A-Za-z0-9_]*)\s*\.\s*[A-Za-z_]/g;
  while ((match = staticPattern.exec(cleanContent)) !== null) {
    // Exclude common non-type words
    const typeName = match[1];
    if (!['String', 'Console', 'Math', 'Convert', 'Guid', 'DateTime', 'TimeSpan', 'Task', 'File', 'Path', 'Directory', 'Environment'].includes(typeName)) {
      types.add(typeName);
    }
  }

  // Pattern: : TypeName (inheritance) or : ITypeName (interface)
  const inheritPattern = /:\s*([A-Z][A-Za-z0-9_]*)/g;
  while ((match = inheritPattern.exec(cleanContent)) !== null) {
    types.add(match[1]);
  }

  // Pattern: <TypeName> (generics)
  const genericPattern = /<\s*([A-Z][A-Za-z0-9_]*)\s*>/g;
  while ((match = genericPattern.exec(cleanContent)) !== null) {
    types.add(match[1]);
  }

  // Pattern: TypeName variableName (declarations)
  const declPattern = /\b([A-Z][A-Za-z0-9_]*)\s+[a-z_][A-Za-z0-9_]*\s*[=;,)]/g;
  while ((match = declPattern.exec(cleanContent)) !== null) {
    const typeName = match[1];
    // Exclude C# keywords that look like types
    if (!['String', 'Object', 'Boolean', 'Int32', 'Int64', 'Double', 'Decimal', 'Byte', 'Char', 'Void'].includes(typeName)) {
      types.add(typeName);
    }
  }

  return types;
}
