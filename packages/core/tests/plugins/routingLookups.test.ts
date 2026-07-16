import { describe, expect, it } from 'vitest';
import { CorePluginRegistry, getPluginsForExtension } from '../../src';
import {
  getPluginForFile,
  getPluginInfosForFile,
  getPluginsForFile,
  getSupportedExtensions,
  supportsFile,
  type IRoutablePluginInfo,
} from '../../src/plugins/routing/router/lookups';
import { plugin } from './routingFixture';

describe('plugins/routing', () => {
  it('returns extension-specific plugins followed by wildcard plugins', () => {
    const plugins = new Map<string, IRoutablePluginInfo>([
      ['typescript', { plugin: plugin('typescript', ['.ts']) }],
      ['wildcard', { plugin: plugin('wildcard', ['*']) }],
    ]);
    const extensionMap = new Map([
      ['.ts', ['typescript']],
      ['*', ['wildcard']],
    ]);

    expect(getPluginsForExtension('.TS', plugins, extensionMap).map((candidate) => candidate.id)).toEqual([
      'typescript',
      'wildcard',
    ]);
  });

  it('matches plugin declarations case-insensitively after normalization', () => {
    const plugins = new Map<string, IRoutablePluginInfo>([
      ['typescript', { plugin: plugin('typescript', ['.TS']) }],
      ['wildcard', { plugin: plugin('wildcard', ['*']) }],
    ]);
    const extensionMap = new Map([
      ['.ts', ['typescript']],
      ['*', ['wildcard']],
    ]);

    expect(getPluginsForExtension('TS', plugins, extensionMap).map((candidate) => candidate.id)).toEqual([
      'typescript',
      'wildcard',
    ]);
  });

  it('routes through the registry facade for wildcard support checks', () => {
    const registry = new CorePluginRegistry();
    registry.register(plugin('wildcard', ['*']));

    expect(registry.supportsFile('src/app.anything')).toBe(true);
    expect(registry.getPluginsForExtension('.anything').map((candidate) => candidate.id)).toEqual(['wildcard']);
  });

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
