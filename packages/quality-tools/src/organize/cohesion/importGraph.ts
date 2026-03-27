import { readFileSync } from 'fs';
import { join } from 'path';
import * as ts from 'typescript';

/**
 * Map from filename to set of sibling filenames it imports from.
 * Only includes imports that resolve to files in the same directory.
 */
export type ImportAdjacency = Map<string, Set<string>>;

/**
 * Build an intra-directory import adjacency graph.
 *
 * For each file in fileNames, reads its content and extracts all relative imports
 * (both import and export declarations). Only includes imports that resolve to
 * sibling files in the same directory (e.g., './foo' that matches 'foo.ts').
 *
 * @param directoryPath - The absolute path to the directory containing the files
 * @param fileNames - List of filenames (without path) to analyze
 * @returns An adjacency map from importing filename to set of imported filenames
 */
export function buildImportGraph(directoryPath: string, fileNames: string[]): ImportAdjacency {
  const adjacency: ImportAdjacency = new Map();

  // Initialize each file with an empty set
  for (const fileName of fileNames) {
    adjacency.set(fileName, new Set());
  }

  // Build a set of available files with various extensions
  // Map from base name to available filename
  const availableFiles = new Map<string, string>();
  for (const fileName of fileNames) {
    const baseName = removeExtension(fileName);
    availableFiles.set(baseName, fileName);
  }

  // Process each file
  for (const fileName of fileNames) {
    const filePath = join(directoryPath, fileName);
    let fileContent: string;

    try {
      fileContent = readFileSync(filePath, 'utf-8');
    } catch {
      // If file cannot be read, skip it
      continue;
    }

    // Determine the script kind based on file extension
    let scriptKind = ts.ScriptKind.TS;
    if (fileName.endsWith('.jsx')) {
      scriptKind = ts.ScriptKind.JSX;
    } else if (fileName.endsWith('.js')) {
      scriptKind = ts.ScriptKind.JS;
    } else if (fileName.endsWith('.tsx')) {
      scriptKind = ts.ScriptKind.TSX;
    }

    const sourceFile = ts.createSourceFile(
      fileName,
      fileContent,
      ts.ScriptTarget.Latest,
      true,
      scriptKind
    );

    const imports = extractImports(sourceFile);

    // Resolve each import to a filename
    for (const importSpecifier of imports) {
      const resolvedFileName = resolveImportToFile(importSpecifier, availableFiles);
      if (resolvedFileName) {
        const importingFileSet = adjacency.get(fileName);
        if (importingFileSet) {
          importingFileSet.add(resolvedFileName);
        }
      }
    }
  }

  return adjacency;
}

/**
 * Remove the file extension from a filename.
 * Handles compound extensions like .test.ts.
 */
function removeExtension(fileName: string): string {
  // Compound extensions first
  const compoundExtensions = ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx'];
  for (const ext of compoundExtensions) {
    if (fileName.endsWith(ext)) {
      return fileName.slice(0, -(ext.length));
    }
  }

  // Single extensions
  const singleExtensions = ['.ts', '.tsx', '.js', '.jsx'];
  for (const ext of singleExtensions) {
    if (fileName.endsWith(ext)) {
      return fileName.slice(0, -(ext.length));
    }
  }

  return fileName;
}

/**
 * Extract all import module specifiers from a source file.
 * Includes both import and export declarations.
 */
function extractImports(sourceFile: ts.SourceFile): string[] {
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
 * Resolve an import specifier to a filename in the same directory.
 *
 * Only resolves relative imports starting with './'.
 * Tries appending .ts, .tsx, .js, .jsx extensions.
 *
 * @param importSpecifier - The import string (e.g., './foo')
 * @param availableFiles - Map from base name (without extension) to actual filename
 * @returns The resolved filename, or undefined if not found
 */
function resolveImportToFile(importSpecifier: string, availableFiles: Map<string, string>): string | undefined {
  // Only process relative imports from the current directory
  if (!importSpecifier.startsWith('./')) {
    return undefined;
  }

  // Remove the './' prefix
  let relativePath = importSpecifier.slice(2);

  // Strip extension from the relative path if it has one
  // This allows './foo.ts' to resolve to the base name 'foo'
  const compoundExtensions = ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx'];
  for (const ext of compoundExtensions) {
    if (relativePath.endsWith(ext)) {
      relativePath = relativePath.slice(0, -(ext.length));
      break;
    }
  }

  // Single extensions
  const singleExtensions = ['.ts', '.tsx', '.js', '.jsx'];
  for (const ext of singleExtensions) {
    if (relativePath.endsWith(ext)) {
      relativePath = relativePath.slice(0, -(ext.length));
      break;
    }
  }

  // Now look up by base name (which is what we store in availableFiles)
  if (availableFiles.has(relativePath)) {
    return availableFiles.get(relativePath);
  }

  return undefined;
}
