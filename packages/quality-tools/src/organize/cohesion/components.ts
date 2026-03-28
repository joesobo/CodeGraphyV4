import type { ImportAdjacency } from './importGraph';

/**
 * Find connected components in the import graph (treating it as undirected).
 */
export function findImportComponents(fileNames: string[], importGraph: ImportAdjacency): Set<string>[] {
  const visited = new Set<string>();
  const components: Set<string>[] = [];

  for (const fileName of fileNames) {
    if (!visited.has(fileName)) {
      const component = new Set<string>();
      bfsComponent(fileName, importGraph, visited, component);
      if (component.size > 0) {
        components.push(component);
      }
    }
  }

  return components;
}

/**
 * BFS to find all files connected to the starting file (treating imports as undirected).
 */
export function bfsComponent(
  startFile: string,
  importGraph: ImportAdjacency,
  visited: Set<string>,
  component: Set<string>
) {
  const queue: string[] = [startFile];
  visited.add(startFile);
  component.add(startFile);

  while (queue.length > 0) {
    const current = queue.shift()!;

    // Forward edges: files that current imports
    const importedFiles = importGraph.get(current) ?? new Set();
    for (const imported of importedFiles) {
      if (!visited.has(imported)) {
        visited.add(imported);
        component.add(imported);
        queue.push(imported);
      }
    }

    // Backward edges: files that import current (treat as undirected)
    for (const [file, imports] of importGraph) {
      if (imports.has(current) && !visited.has(file)) {
        visited.add(file);
        component.add(file);
        queue.push(file);
      }
    }
  }
}
