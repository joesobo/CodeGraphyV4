/**
 * Mock data representing a mini React application
 * Used for testing graph rendering before real file discovery is implemented
 */

import { IFileData, IGraphNode, IGraphEdge, getFileColor } from './types';

/**
 * Mock file data simulating a React application structure
 */
export const MOCK_FILE_DATA: IFileData[] = [
  // Root files
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

  // Components
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

  // Hooks
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

  // API
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

  // Utils
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

  // Styles
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

  // Config files
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
 * Convert IFileData array to IGraphNode array
 */
export function fileDataToNodes(files: IFileData[]): IGraphNode[] {
  return files.map((file) => ({
    id: file.path,
    label: file.name,
    color: getFileColor(file.extension),
  }));
}

/**
 * Convert IFileData array to IGraphEdge array
 * Only creates edges where both source and target files exist in the data
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
 * Get mock graph data ready for Vis Network
 */
export function getMockGraphData() {
  return {
    nodes: fileDataToNodes(MOCK_FILE_DATA),
    edges: fileDataToEdges(MOCK_FILE_DATA),
  };
}
