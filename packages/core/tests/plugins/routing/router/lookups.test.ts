import type { IPlugin } from '@codegraphy-dev/plugin-api';
import { describe, expect, it } from 'vitest';
import {
  getPluginForFile,
  getPluginInfosForFile,
  getPluginsForFile,
  getSupportedExtensions,
  supportsFile,
  type IRoutablePluginInfo,
} from '../../../../src/plugins/routing/router/lookups';

function plugin(id: string, supportedExtensions: string[]): IPlugin {
  return {
    id,
    name: id,
    version: '1.0.0',
    apiVersion: '2',
    supportedExtensions,
  };
}

describe('plugins/routing/router/lookups', () => {
  it('returns the first available plugin for a file, falling back to wildcard plugins', () => {
    const wildcard = plugin('wildcard', ['*']);
    const plugins = new Map<string, IRoutablePluginInfo>([
      ['wildcard', { plugin: wildcard }],
    ]);
    const extensionMap = new Map([
      ['.ts', ['missing-typescript']],
      ['*', ['wildcard']],
    ]);

    expect(getPluginForFile('src/app.ts', plugins, extensionMap)).toBe(wildcard);
    expect(getPluginForFile('src/app.rb', new Map(), new Map())).toBeUndefined();
  });

  it('returns plugin and plugin-info lists for matching file extensions', () => {
    const typescript = plugin('typescript', ['.ts']);
    const wildcard = plugin('wildcard', ['*']);
    const plugins = new Map<string, IRoutablePluginInfo>([
      ['typescript', { plugin: typescript, options: { strict: true } }],
      ['wildcard', { plugin: wildcard }],
    ]);
    const extensionMap = new Map([
      ['.ts', ['typescript', 'missing']],
      ['*', ['wildcard']],
    ]);

    expect(getPluginsForFile('src/app.TS', plugins, extensionMap)).toEqual([typescript, wildcard]);
    expect(getPluginInfosForFile('src/app.ts', plugins, extensionMap)).toEqual([
      { plugin: typescript, options: { strict: true } },
      { plugin: wildcard },
    ]);
  });

  it('reports support and supported extension keys from the extension map', () => {
    const extensionMap = new Map([
      ['.ts', ['typescript']],
      ['*', ['wildcard']],
    ]);

    expect(supportsFile('src/app.ts', extensionMap)).toBe(true);
    expect(supportsFile('src/app.rb', new Map([['.ts', ['typescript']]]))).toBe(false);
    expect(supportsFile('src/app.rb', extensionMap)).toBe(true);
    expect(getSupportedExtensions(extensionMap)).toEqual(['.ts', '*']);
  });
});
