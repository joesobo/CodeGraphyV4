/**
 * @fileoverview Mock data for component files (Header, Button, Card, Modal, UserProfile, PostList).
 * @module shared/mockDataComponents
 */

import type { IFileData } from './contracts';

export const MOCK_COMPONENTS: IFileData[] = [
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
];
