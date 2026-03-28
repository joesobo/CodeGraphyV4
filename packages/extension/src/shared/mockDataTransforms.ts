/**
 * @fileoverview Transform functions for converting mock file data into graph structures.
 * @module shared/mockDataTransforms
 */

import { IFileData, IGraphNode, IGraphEdge, getFileColor } from './contracts';

/**
 * Converts an array of file data to graph nodes.
 * Each file becomes a node with its path as ID, filename as label,
 * and color determined by file extension.
 *
 * @param files - Array of file data to convert
 * @returns Array of graph nodes ready for Vis Network
 *
 * @example
 * ```typescript
 * const files: IFileData[] = [
 *   { path: 'src/App.tsx', name: 'App.tsx', extension: '.tsx', imports: [] }
 * ];
 * const nodes = fileDataToNodes(files);
 * // Result: [{ id: 'src/App.tsx', label: 'App.tsx', color: '#67E8F9' }]
 * ```
 */
export function fileDataToNodes(files: IFileData[]): IGraphNode[] {
  return files.map((file) => ({
    id: file.path,
    label: file.name,
    color: getFileColor(file.extension),
  }));
}

/**
 * Converts an array of file data to graph edges based on import relationships.
 * Only creates edges where both source and target files exist in the data,
 * preventing orphan edges to non-existent nodes.
 *
 * @param files - Array of file data to extract imports from
 * @returns Array of graph edges ready for Vis Network
 *
 * @example
 * ```typescript
 * const files: IFileData[] = [
 *   { path: 'a.ts', name: 'a.ts', extension: '.ts', imports: ['b.ts'] },
 *   { path: 'b.ts', name: 'b.ts', extension: '.ts', imports: [] }
 * ];
 * const edges = fileDataToEdges(files);
 * // Result: [{ id: 'a.ts->b.ts', from: 'a.ts', to: 'b.ts' }]
 * ```
 */
export function fileDataToEdges(files: IFileData[]): IGraphEdge[] {
  const filePaths = new Set(files.map((file) => file.path));
  const edges: IGraphEdge[] = [];

  for (const file of files) {
    for (const importPath of file.imports) {
      // Only create edge if the imported file exists in our data
      if (filePaths.has(importPath)) {
        edges.push({
          id: `${file.path}->${importPath}`,
          from: file.path,
          to: importPath,
        });
      }
    }
  }

  return edges;
}

