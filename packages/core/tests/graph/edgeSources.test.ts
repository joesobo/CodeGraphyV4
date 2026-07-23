import { describe, expect, it, vi } from 'vitest';
import type { IPlugin } from '@codegraphy-dev/plugin-api';
import type { IProjectedConnection } from '../../src/analysis/projectedConnection';
import {
  createEdgeSource,
  createQualifiedSourceId,
} from '../../src/graph/edgeSources';

function createPlugin(id: string, sources: IPlugin['sources'] = [
  { id: 'import', name: 'Import', description: 'Import relation' },
]): IPlugin {
  return {
    id,
    name: id,
    version: '1.0.0',
    apiVersion: '^4.0.0',
    supportedExtensions: ['.ts'],
    sources,
    analyzeFile: vi.fn(async (filePath: string) => ({ filePath, relations: [] })),
  } as IPlugin;
}

describe('core/graph/edgeSources', () => {
  it('qualifies source ids with the plugin id', () => {
    expect(createQualifiedSourceId({ sourceId: 'import' })).toBeUndefined();
    expect(
      createQualifiedSourceId(
        { pluginId: 'plugin.markdown', sourceId: 'wikilink' },
      ),
    ).toBe('plugin.markdown:wikilink');
    expect(createQualifiedSourceId({ sourceId: 'import' })).toBeUndefined();
    expect(
      createQualifiedSourceId(
        { sourceId: '' },
      ),
    ).toBeUndefined();
  });

  it('creates edge sources with plugin metadata and connection metadata', () => {
    const connection: IProjectedConnection = {
      kind: 'import',
      metadata: { line: 42 },
      pluginId: 'plugin.typescript',
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
    expect(createEdgeSource(undefined, connection)).toEqual({
      id: 'plugin.typescript:import',
      pluginId: 'plugin.typescript',
      sourceId: 'import',
      label: 'import',
      metadata: { line: 42 },
      variant: 'dynamic',
    });
  });

  it('returns undefined when a connection has no source id', () => {
    const connection: IProjectedConnection = {
      kind: 'import',
      resolvedPath: '/workspace/src/utils.ts',
      sourceId: '',
      specifier: './utils',
    };

    expect(createEdgeSource(createPlugin('plugin.typescript'), connection)).toBeUndefined();

    const connectionWithoutSourceId = { ...connection } as Partial<IProjectedConnection>;
    delete connectionWithoutSourceId.sourceId;

    expect(
      createEdgeSource(
        createPlugin('plugin.typescript'),
        connectionWithoutSourceId as IProjectedConnection,
      ),
    ).toBeUndefined();
  });

  it('falls back to the raw source id when plugin metadata is missing', () => {
    const connection: IProjectedConnection = {
      kind: 'import',
      pluginId: 'plugin.typescript',
      resolvedPath: null,
      sourceId: 'barrel-export',
      specifier: 'react',
    };

    expect(createEdgeSource(createPlugin('plugin.typescript'), {
      ...connection,
      sourceId: 'import',
    })?.label).toBe('Import');
    expect(createEdgeSource({
      ...createPlugin('plugin.typescript'),
      sources: undefined,
    }, connection)?.label).toBe('barrel-export');
    expect(createEdgeSource(createPlugin('plugin.typescript', []), connection)?.label).toBe('barrel-export');
  });
});
