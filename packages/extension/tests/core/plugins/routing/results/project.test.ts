import { describe, expect, it } from 'vitest';
import type { IPlugin } from '../../../../../../plugin-api/src';
import {
  toProjectedConnectionsFromFileAnalysis,
  withPluginProvenance,
} from '@codegraphy-dev/core';

describe('routing/results/project', () => {
  it('adds the plugin id to relations that do not already have provenance', () => {
    const plugin = { id: 'plugin' } as IPlugin;

    expect(withPluginProvenance(plugin, {
      filePath: 'src/app.ts',
      edgeTypes: [],
      nodeTypes: [],
      nodes: [],
      relations: [
        { edgeType: 'import', sourceId: 'plugin:import', from: { kind: 'file', filePath: 'src/app.ts' }, target: { kind: 'file', path: 'src/lib.ts' } },
        {
          edgeType: 'import',
          sourceId: 'plugin:kept',
          from: { kind: 'file', filePath: 'src/app.ts' },
          target: { kind: 'file', path: 'src/kept.ts' },
          pluginId: 'existing-plugin',
        },
      ],
      symbols: [],
    }).relations).toEqual([
      {
        edgeType: 'import',
        sourceId: 'plugin:import',
        from: { kind: 'file', filePath: 'src/app.ts' },
        target: { kind: 'file', path: 'src/lib.ts' },
        pluginId: 'plugin',
      },
      {
        edgeType: 'import',
        sourceId: 'plugin:kept',
        from: { kind: 'file', filePath: 'src/app.ts' },
        target: { kind: 'file', path: 'src/kept.ts' },
        pluginId: 'existing-plugin',
      },
    ]);
  });

  it('preserves missing relations when adding plugin provenance', () => {
    const plugin = { id: 'plugin' } as IPlugin;

    expect(withPluginProvenance(plugin, {
      filePath: 'src/app.ts',
      edgeTypes: [],
      nodeTypes: [],
      nodes: [],
      symbols: [],
    })).toEqual({
      filePath: 'src/app.ts',
      edgeTypes: [],
      nodeTypes: [],
      nodes: [],
      symbols: [],
    });
  });

  it('projects file analysis relations into graph connections', () => {
    expect(toProjectedConnectionsFromFileAnalysis({
      filePath: 'src/app.ts',
      edgeTypes: [],
      nodeTypes: [],
      nodes: [],
      relations: [{
        edgeType: 'call',
        pluginId: 'plugin',
        sourceId: 'plugin:call',
        from: { kind: 'file', filePath: 'src/app.ts' },
        target: { kind: 'file', path: 'src/lib.ts' },
        timing: 'dynamic',
        variant: 'async',
        metadata: { line: 10 },
      }],
      symbols: [],
    }, '')).toEqual([{
      kind: 'call',
      pluginId: 'plugin',
      sourceId: 'plugin:call',
      specifier: '',
      resolvedPath: 'src/lib.ts',
      type: 'dynamic',
      variant: 'async',
      metadata: { line: 10 },
    }]);
  });

  it('returns no projected connections when the analysis has no relations', () => {
    expect(toProjectedConnectionsFromFileAnalysis({
      filePath: 'src/app.ts',
      edgeTypes: [],
      nodeTypes: [],
      nodes: [],
      symbols: [],
    }, '')).toEqual([]);
  });
});
