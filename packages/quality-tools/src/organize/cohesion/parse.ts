import { readFileSync } from 'fs';
import * as ts from 'typescript';
import { getScriptKind } from './scriptKind';

/**
 * Extract all import module specifiers from a source file.
 * Includes both import and export declarations.
 */
export function extractImports(sourceFile: ts.SourceFile): string[] {
  const imports: string[] = [];

  function visit(node: ts.Node) {
    // Handle import declarations: import ... from '...'
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier;
      if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
        imports.push(moduleSpecifier.text);
      }
    }

    // Handle export declarations: export ... from '...' or export * from '...'
    if (ts.isExportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier;
      if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
        imports.push(moduleSpecifier.text);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return imports;
}

/**
 * Parse a file and extract its import statements.
 * Returns empty array if file cannot be read.
 */
export function parseFileImports(filePath: string, fileName: string): string[] {
  try {
    const fileContent = readFileSync(filePath, 'utf-8');
    const scriptKind = getScriptKind(fileName);

    const sourceFile = ts.createSourceFile(
      fileName,
      fileContent,
      ts.ScriptTarget.Latest,
      true,
      scriptKind
    );

    return extractImports(sourceFile);
  } catch {
    return [];
  }
}
