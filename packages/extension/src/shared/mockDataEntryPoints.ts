/**
 * @fileoverview Mock data for entry point files (index.tsx, App.tsx).
 * @module shared/mockDataEntryPoints
 */

import type { IFileData } from './contracts';

export const MOCK_ENTRY_POINTS: IFileData[] = [
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
];
