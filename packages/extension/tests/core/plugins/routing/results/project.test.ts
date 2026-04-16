import { describe, expect, it } from 'vitest';
import type { IPlugin } from '../../../../../src/core/plugins/types/contracts';
import {
  toProjectedConnectionsFromFileAnalysis,
  withPluginProvenance,
} from '../../../../../src/core/plugins/routing/router/results/project';

describe('routing/results/project', () => {
  it('adds the plugin id to relations that do not already have provenance', () => {
    const plugin = { id: 'plugin' } as IPlugin;

    expect(withPluginProvenance(plugin, {
      filePath: 'src/app.ts',
      edgeTypes: [],
      nodeTypes: [],
      nodes: [],
      relations: [
        { kind: 'import', sourceId: 'plugin:import', fromFilePath: 'src/app.ts', toFilePath: 'src/lib.ts' },
        {
          kind: 'import',
          sourceId: 'plugin:kept',
          fromFilePath: 'src/app.ts',
          toFilePath: 'src/kept.ts',
          pluginId: 'existing-plugin',
        },
      ],
      symbols: [],
    }).relations).toEqual([
      {
        kind: 'import',
        sourceId: 'plugin:import',
        fromFilePath: 'src/app.ts',
        toFilePath: 'src/lib.ts',
        pluginId: 'plugin',
      },
      {
        kind: 'import',
        sourceId: 'plugin:kept',
        fromFilePath: 'src/app.ts',
        toFilePath: 'src/kept.ts',
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
        kind: 'call',
        pluginId: 'plugin',
        sourceId: 'plugin:call',
        fromFilePath: 'src/app.ts',
        resolvedPath: 'src/lib.ts',
        type: 'dynamic',
        variant: 'async',
        metadata: { line: 10 },
      }],
      symbols: [],
    })).toEqual([{
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
    })).toEqual([]);
  });
});
