import type { IPlugin } from '@codegraphy-dev/plugin-api';
import { vi } from 'vitest';

export function createPlugin(id: string): IPlugin {
  return {
    id,
    name: id,
    version: '1.0.0',
    apiVersion: '^3.0.0',
    supportedExtensions: ['.ts'],
    sources: [
      { id: 'es6-import', name: 'ES6 import', description: 'ES module import' },
      { id: 'dynamic-import', name: 'Dynamic import', description: 'Dynamic import()' },
    ],
    analyzeFile: vi.fn(async (filePath: string) => ({ filePath, relations: [] })),
  } as IPlugin;
}

export const SYMBOL_NODE_VISIBILITY = {
  symbol: true,
  'symbol:function': true,
};

export const VARIABLE_NODE_VISIBILITY = {
  symbol: true,
  variable: true,
  'symbol:constant': true,
};
