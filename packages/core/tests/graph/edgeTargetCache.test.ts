import { describe, expect, it, vi } from 'vitest';
import type { IPlugin } from '@codegraphy-dev/plugin-api';
import type { IProjectedConnection } from '../../src/analysis/projectedConnection';
import {
  createCachedConnectionTargetResolver,
  type ConnectionTargetResolver,
} from '../../src/graph/edgeTargetCache';

function createPlugin(id: string): IPlugin {
  return {
    id,
    name: id,
    version: '1.0.0',
    apiVersion: '^3.0.0',
    supportedExtensions: ['.ts'],
    analyzeFile: vi.fn(async (filePath: string) => ({ filePath, relations: [] })),
  } as IPlugin;
}

function createConnection(
  overrides: Partial<IProjectedConnection> = {},
): IProjectedConnection {
  return {
    kind: 'import',
    resolvedPath: '/workspace/src/target.ts',
    sourceId: 'import',
    specifier: './target',
    ...overrides,
  };
}

describe('core/graph/edgeTargetCache', () => {
  it('reuses resolved-path targets for the same plugin and connection target', () => {
    const fileConnections = new Map<string, IProjectedConnection[]>();
    const resolveConnectionTargetId = vi.fn<ConnectionTargetResolver>(() => 'src/target.ts');
    const resolveCachedTarget = createCachedConnectionTargetResolver(
      resolveConnectionTargetId,
      fileConnections,
      '/workspace',
    );
    const plugin = createPlugin('plugin.typescript');
    const connection = createConnection();

    expect(resolveCachedTarget(plugin, connection)).toBe('src/target.ts');
    expect(resolveCachedTarget(plugin, { ...connection, specifier: './renamed' })).toBe('src/target.ts');
    expect(resolveConnectionTargetId).toHaveBeenCalledOnce();
    expect(resolveConnectionTargetId).toHaveBeenCalledWith(
      plugin,
      connection,
      fileConnections,
      '/workspace',
    );
  });

  it('keeps resolved-path cache entries separate by plugin id', () => {
    const resolveConnectionTargetId = vi
      .fn<ConnectionTargetResolver>()
      .mockReturnValueOnce('src/typescript.ts')
      .mockReturnValueOnce('src/vue.ts');
    const resolveCachedTarget = createCachedConnectionTargetResolver(
      resolveConnectionTargetId,
      new Map(),
      '/workspace',
    );
    const connection = createConnection();

    expect(resolveCachedTarget(createPlugin('plugin.typescript'), connection)).toBe('src/typescript.ts');
    expect(resolveCachedTarget(createPlugin('plugin.vue'), connection)).toBe('src/vue.ts');
    expect(resolveConnectionTargetId).toHaveBeenCalledTimes(2);
  });

  it('caches null resolved-path targets', () => {
    const resolveConnectionTargetId = vi.fn<ConnectionTargetResolver>(() => null);
    const resolveCachedTarget = createCachedConnectionTargetResolver(
      resolveConnectionTargetId,
      new Map(),
      '/workspace',
    );
    const connection = createConnection();

    expect(resolveCachedTarget(undefined, connection)).toBeNull();
    expect(resolveCachedTarget(undefined, connection)).toBeNull();
    expect(resolveConnectionTargetId).toHaveBeenCalledOnce();
  });

  it('uses the specifier as a cache key when no resolved path exists', () => {
    const resolveConnectionTargetId = vi.fn<ConnectionTargetResolver>(() => 'pkg:react');
    const resolveCachedTarget = createCachedConnectionTargetResolver(
      resolveConnectionTargetId,
      new Map(),
      '/workspace',
    );
    const connection = createConnection({
      resolvedPath: null,
      specifier: 'react',
    });

    expect(resolveCachedTarget(createPlugin('plugin.typescript'), connection)).toBe('pkg:react');
    expect(resolveCachedTarget(createPlugin('plugin.typescript'), connection)).toBe('pkg:react');
    expect(resolveConnectionTargetId).toHaveBeenCalledOnce();
  });

  it('keeps specifier cache entries separate by plugin id', () => {
    const resolveConnectionTargetId = vi
      .fn<ConnectionTargetResolver>()
      .mockReturnValueOnce('pkg:typescript-react')
      .mockReturnValueOnce('pkg:vue-react');
    const resolveCachedTarget = createCachedConnectionTargetResolver(
      resolveConnectionTargetId,
      new Map(),
      '/workspace',
    );
    const connection = createConnection({
      resolvedPath: null,
      specifier: 'react',
    });

    expect(resolveCachedTarget(createPlugin('plugin.typescript'), connection)).toBe('pkg:typescript-react');
    expect(resolveCachedTarget(createPlugin('plugin.vue'), connection)).toBe('pkg:vue-react');
    expect(resolveConnectionTargetId).toHaveBeenCalledTimes(2);
  });

  it('caches specifier targets without a plugin', () => {
    const resolveConnectionTargetId = vi.fn<ConnectionTargetResolver>(() => 'pkg:react');
    const resolveCachedTarget = createCachedConnectionTargetResolver(
      resolveConnectionTargetId,
      new Map(),
      '/workspace',
    );
    const connection = createConnection({
      resolvedPath: null,
      specifier: 'react',
    });

    expect(resolveCachedTarget(undefined, connection)).toBe('pkg:react');
    expect(resolveCachedTarget(undefined, connection)).toBe('pkg:react');
    expect(resolveConnectionTargetId).toHaveBeenCalledOnce();
  });

  it('does not cache connections without a resolved path or specifier', () => {
    const resolveConnectionTargetId = vi
      .fn<ConnectionTargetResolver>()
      .mockReturnValueOnce(null)
      .mockReturnValueOnce('dynamic-target');
    const resolveCachedTarget = createCachedConnectionTargetResolver(
      resolveConnectionTargetId,
      new Map(),
      '/workspace',
    );
    const connection = createConnection({
      resolvedPath: null,
      specifier: '',
    });

    expect(resolveCachedTarget(undefined, connection)).toBeNull();
    expect(resolveCachedTarget(undefined, connection)).toBe('dynamic-target');
    expect(resolveConnectionTargetId).toHaveBeenCalledTimes(2);
  });
});
