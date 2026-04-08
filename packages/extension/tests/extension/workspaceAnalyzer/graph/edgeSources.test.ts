import { describe, expect, it, vi } from 'vitest';
import type { IConnection, IPlugin } from '../../../../src/core/plugins/types/contracts';
import {
  createEdgeSource,
  createQualifiedSourceId,
} from '../../../../src/extension/workspaceAnalyzer/graph/edgeSources';

function createPlugin(id: string, sources: IPlugin['sources'] = [
  { id: 'import', name: 'Import', description: 'Import relation' },
]): IPlugin {
  return {
    id,
    name: id,
    version: '1.0.0',
    apiVersion: '^3.0.0',
    supportedExtensions: ['.ts'],
    sources,
    detectConnections: vi.fn(async () => []),
  };
}

describe('workspaceAnalyzer/graph/edgeSources', () => {
  it('qualifies source ids with the plugin id', () => {
    expect(createQualifiedSourceId(createPlugin('plugin.typescript'), { sourceId: 'import' })).toBe(
      'plugin.typescript:import',
    );
    expect(createQualifiedSourceId(undefined, { sourceId: 'import' })).toBeUndefined();
    expect(
      createQualifiedSourceId(
        createPlugin('plugin.typescript'),
        { sourceId: '' },
      ),
    ).toBeUndefined();
  });

  it('creates edge sources with plugin metadata and connection metadata', () => {
    const connection: IConnection = {
      kind: 'import',
      metadata: { line: 42 },
      resolvedPath: '/workspace/src/utils.ts',
      sourceId: 'import',
      specifier: './utils',
      variant: 'dynamic',
    };

    expect(createEdgeSource(createPlugin('plugin.typescript'), connection)).toEqual({
      id: 'plugin.typescript:import',
      pluginId: 'plugin.typescript',
      sourceId: 'import',
      label: 'Import',
      metadata: { line: 42 },
      variant: 'dynamic',
    });
    expect(createEdgeSource(undefined, connection)).toBeUndefined();
  });

  it('returns undefined when a connection has no source id', () => {
    const connection: IConnection = {
      kind: 'import',
      resolvedPath: '/workspace/src/utils.ts',
      sourceId: '',
      specifier: './utils',
    };

    expect(createEdgeSource(createPlugin('plugin.typescript'), connection)).toBeUndefined();
  });

  it('falls back to the raw source id when plugin metadata is missing', () => {
    const connection: IConnection = {
      kind: 'import',
      resolvedPath: null,
      sourceId: 'reexport',
      specifier: 'react',
    };

    expect(createEdgeSource(createPlugin('plugin.typescript'), {
      ...connection,
      sourceId: 'import',
    })?.label).toBe('Import');
    expect(createEdgeSource(createPlugin('plugin.typescript', undefined), connection)?.label).toBe('reexport');
    expect(createEdgeSource(createPlugin('plugin.typescript', []), connection)?.label).toBe('reexport');
  });
});
