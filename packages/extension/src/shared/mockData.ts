/**
 * @fileoverview Mock data representing a mini React application.
 * Used for testing and development before real file discovery is implemented.
 * 
 * The mock data simulates a typical React project structure with:
 * - Entry point (index.tsx, App.tsx)
 * - Components (Header, Button, Card, Modal, etc.)
 * - Hooks (useAuth, useApi, useLocalStorage)
 * - API layer (client, users, posts)
 * - Utils (helpers, constants)
 * - Styles (global.css, variables.css)
 * - Config files (package.json, tsconfig.json, README.md)
 * 
 * @module shared/mockData
 */

import { IFileData, IGraphNode, IGraphEdge, IGraphData, getFileColor } from './types';

/**
 * Mock file data simulating a React application structure.
 * Contains 21 files with realistic import relationships.
 * 
 * @remarks
 * All import paths are verified to exist within the mock data set,
 * ensuring no orphan edges are created.
 */
export const MOCK_FILE_DATA: IFileData[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // Entry Points
  // ─────────────────────────────────────────────────────────────────────────
  {
    path: 'src/index.tsx',
    name: 'index.tsx',
    extension: '.tsx',
    imports: ['src/App.tsx', 'src/styles/global.css'],
  },
  {
    path: 'src/App.tsx',
    name: 'App.tsx',
    extension: '.tsx',
    imports: [
      'src/components/Header.tsx',
      'src/components/Card.tsx',
      'src/components/Modal.tsx',
      'src/hooks/useAuth.ts',
      'src/utils/helpers.ts',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Components
  // ─────────────────────────────────────────────────────────────────────────
  {
    path: 'src/components/Header.tsx',
    name: 'Header.tsx',
    extension: '.tsx',
    imports: ['src/components/Button.tsx', 'src/hooks/useAuth.ts'],
  },
  {
    path: 'src/components/Button.tsx',
    name: 'Button.tsx',
    extension: '.tsx',
    imports: ['src/styles/variables.css'],
  },
  {
    path: 'src/components/Card.tsx',
    name: 'Card.tsx',
    extension: '.tsx',
    imports: ['src/components/Button.tsx'],
  },
  {
    path: 'src/components/Modal.tsx',
    name: 'Modal.tsx',
    extension: '.tsx',
    imports: ['src/components/Button.tsx', 'src/hooks/useLocalStorage.ts'],
  },
  {
    path: 'src/components/UserProfile.tsx',
    name: 'UserProfile.tsx',
    extension: '.tsx',
    imports: ['src/components/Card.tsx', 'src/hooks/useAuth.ts', 'src/api/users.ts'],
  },
  {
    path: 'src/components/PostList.tsx',
    name: 'PostList.tsx',
    extension: '.tsx',
    imports: ['src/components/Card.tsx', 'src/api/posts.ts', 'src/hooks/useApi.ts'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Hooks
  // ─────────────────────────────────────────────────────────────────────────
  {
    path: 'src/hooks/useAuth.ts',
    name: 'useAuth.ts',
    extension: '.ts',
    imports: ['src/api/client.ts', 'src/hooks/useLocalStorage.ts'],
  },
  {
    path: 'src/hooks/useApi.ts',
    name: 'useApi.ts',
    extension: '.ts',
    imports: ['src/api/client.ts'],
  },
  {
    path: 'src/hooks/useLocalStorage.ts',
    name: 'useLocalStorage.ts',
    extension: '.ts',
    imports: [],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // API Layer
  // ─────────────────────────────────────────────────────────────────────────
  {
    path: 'src/api/client.ts',
    name: 'client.ts',
    extension: '.ts',
    imports: ['src/utils/constants.ts'],
  },
  {
    path: 'src/api/users.ts',
    name: 'users.ts',
    extension: '.ts',
    imports: ['src/api/client.ts'],
  },
  {
    path: 'src/api/posts.ts',
    name: 'posts.ts',
    extension: '.ts',
    imports: ['src/api/client.ts'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────────
  {
    path: 'src/utils/helpers.ts',
    name: 'helpers.ts',
    extension: '.ts',
    imports: ['src/utils/constants.ts'],
  },
  {
    path: 'src/utils/constants.ts',
    name: 'constants.ts',
    extension: '.ts',
    imports: [],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Styles
  // ─────────────────────────────────────────────────────────────────────────
  {
    path: 'src/styles/global.css',
    name: 'global.css',
    extension: '.css',
    imports: ['src/styles/variables.css'],
  },
  {
    path: 'src/styles/variables.css',
    name: 'variables.css',
    extension: '.css',
    imports: [],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Config Files (orphan nodes - no imports)
  // ─────────────────────────────────────────────────────────────────────────
  {
    path: 'package.json',
    name: 'package.json',
    extension: '.json',
    imports: [],
  },
  {
    path: 'tsconfig.json',
    name: 'tsconfig.json',
    extension: '.json',
    imports: [],
  },
  {
    path: 'README.md',
    name: 'README.md',
    extension: '.md',
    imports: [],
  },
];

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
  const filePaths = new Set(files.map((f) => f.path));
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

/**
 * Generates complete mock graph data ready for Vis Network rendering.
 * Combines {@link MOCK_FILE_DATA} into nodes and edges.
 * 
 * @returns Complete graph data structure with nodes and edges
 * 
 * @example
 * ```typescript
 * const graphData = getMockGraphData();
 * console.log(graphData.nodes.length); // 21 files
 * console.log(graphData.edges.length); // ~25 import relationships
 * ```
 */
export function getMockGraphData(): IGraphData {
  return {
    nodes: fileDataToNodes(MOCK_FILE_DATA),
    edges: fileDataToEdges(MOCK_FILE_DATA),
  };
}
