import { describe, expect, it, vi } from 'vitest';
import type { IConnection, IPlugin } from '../../../../src/core/plugins/types/contracts';
import { getConnectionTargetId } from '../../../../src/extension/workspaceAnalyzer/graph/edgeTargets';

function createPlugin(id: string): IPlugin {
  return {
    id,
    name: id,
    version: '1.0.0',
    apiVersion: '^3.0.0',
    supportedExtensions: ['.ts'],
    detectConnections: vi.fn(async () => []),
  };
}

describe('workspaceAnalyzer/graph/edgeTargets', () => {
  it('returns discovered workspace targets for resolved connections', () => {
    const connection: IConnection = {
      kind: 'import',
      resolvedPath: '/workspace/src/utils.ts',
      sourceId: 'import',
      specifier: './utils',
    };

    expect(
      getConnectionTargetId(
        createPlugin('plugin.typescript'),
        connection,
        new Map([['src/utils.ts', []]]),
        '/workspace',
      ),
    ).toBe('src/utils.ts');
  });

  it('returns null for undiscovered resolved targets and non-typescript unresolved imports', () => {
    const connection: IConnection = {
      kind: 'import',
      resolvedPath: '/workspace/src/missing.ts',
      sourceId: 'import',
      specifier: './missing',
    };
    const unresolved: IConnection = {
      kind: 'import',
      resolvedPath: null,
      sourceId: 'import',
      specifier: 'react',
    };

    expect(
      getConnectionTargetId(
        createPlugin('plugin.typescript'),
        connection,
        new Map([['src/utils.ts', []]]),
        '/workspace',
      ),
    ).toBeNull();
    expect(
      getConnectionTargetId(
        createPlugin('plugin.python'),
        unresolved,
        new Map(),
        '/workspace',
      ),
    ).toBeNull();
    expect(getConnectionTargetId(undefined, unresolved, new Map(), '/workspace')).toBeNull();
  });

  it('creates package node ids for unresolved typescript package imports', () => {
    const connection: IConnection = {
      kind: 'import',
      resolvedPath: null,
      sourceId: 'import',
      specifier: '@scope/pkg/subpath',
    };

    expect(
      getConnectionTargetId(
        createPlugin('codegraphy.typescript'),
        connection,
        new Map(),
        '/workspace',
      ),
    ).toBe('pkg:@scope/pkg');
  });
});
