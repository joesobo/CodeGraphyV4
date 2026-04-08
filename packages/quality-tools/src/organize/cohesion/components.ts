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
      components.push(component);
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
  const queued = new Set<string>(visited);
  queued.add(startFile);
  visited.add(startFile);
  component.add(startFile);

  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    // Forward edges: files that current imports
    const importedFiles = importGraph.get(current) ?? new Set();
    for (const imported of importedFiles) {
      if (queued.has(imported)) {
        continue;
      }

      queued.add(imported);
      visited.add(imported);
      component.add(imported);
      queue.push(imported);
    }

    // Backward edges: files that import current (treat as undirected)
    for (const [file, imports] of importGraph) {
      if (!imports.has(current) || queued.has(file)) {
        continue;
      }

      queued.add(file);
      visited.add(file);
      component.add(file);
      queue.push(file);
    }
  }
}
