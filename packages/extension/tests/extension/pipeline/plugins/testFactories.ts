import { vi } from 'vitest';
import type { CodeGraphyInstalledPluginRecord } from '@codegraphy-dev/core';
import type { IPlugin, IPluginInfo } from '../../../../src/core/plugins/types/contracts';

export function createPluginInfo(overrides: Partial<IPlugin>): IPluginInfo {
  const plugin: IPlugin = {
    id: 'test.plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    apiVersion: '^4.0.0',
    supportedExtensions: ['.ts'],
    analyzeFile: vi.fn(async (filePath: string) => ({ filePath, relations: [] })),
    ...overrides,
  } as IPlugin;

  return {
    plugin,
    builtIn: false,
  };
}

export function createInstalledPlugin(
  overrides: Partial<CodeGraphyInstalledPluginRecord>,
): CodeGraphyInstalledPluginRecord {
  return {
    package: '@codegraphy-dev/plugin-test',
    version: '1.0.0',
    id: 'codegraphy.test',
    host: 'core',
    entry: './dist/plugin.js',
    apiVersion: '^4.0.0',
    packageRoot: '/global/node_modules/@codegraphy-dev/plugin-test',
    globallyEnabled: false,
    ...overrides,
  };
}
