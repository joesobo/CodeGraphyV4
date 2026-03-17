/**
 * @fileoverview Mock data for utility, style, and config files.
 * @module shared/mockDataUtilsAndConfig
 */

import type { IFileData } from './types';

export const MOCK_UTILS: IFileData[] = [
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
];

export const MOCK_STYLES: IFileData[] = [
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
];

export const MOCK_CONFIG: IFileData[] = [
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
