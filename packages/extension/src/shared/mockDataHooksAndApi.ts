/**
 * @fileoverview Mock data for hooks and API layer files.
 * @module shared/mockDataHooksAndApi
 */

import type { IFileData } from './types';

export const MOCK_HOOKS: IFileData[] = [
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
];

export const MOCK_API: IFileData[] = [
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
];
