import { join } from 'path';
import { parseFileImports } from './parse';
import { removeExtension } from './extensions';
import { resolveImportToFile } from './resolve';

/**
 * Map from filename to set of sibling filenames it imports from.
 * Only includes imports that resolve to files in the same directory.
 */
export type ImportAdjacency = Map<string, Set<string>>;

/**
 * Add resolved imports from a file to the adjacency map.
 */
function addImportsToAdjacency(
  fileName: string,
  imports: string[],
  adjacency: ImportAdjacency,
  availableFiles: Map<string, string>
): void {
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

  // Build a map from base name to available filename
  const availableFiles = new Map<string, string>();
  for (const fileName of fileNames) {
    const baseName = removeExtension(fileName);
    availableFiles.set(baseName, fileName);
  }

  // Process each file
  for (const fileName of fileNames) {
    const filePath = join(directoryPath, fileName);
    const imports = parseFileImports(filePath, fileName);
    addImportsToAdjacency(fileName, imports, adjacency, availableFiles);
  }

  return adjacency;
}
