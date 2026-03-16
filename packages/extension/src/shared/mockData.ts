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

import { IFileData, IGraphData } from './types';
import { fileDataToNodes, fileDataToEdges } from './mockDataTransforms';

export { fileDataToNodes, fileDataToEdges } from './mockDataTransforms';

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

