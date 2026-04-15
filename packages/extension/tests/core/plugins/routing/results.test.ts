import { describe, expect, it } from 'vitest';
import type { IPlugin } from '../../../../src/core/plugins/types/contracts';
import {
  createEmptyFileAnalysisResult,
  getRelationKey,
  mergeFileAnalysisResults,
  toProjectedConnectionsFromFileAnalysis,
  withPluginProvenance,
} from '../../../../src/core/plugins/routing/router/results';

describe('routing/results', () => {
  it('builds distinct relation keys for resolved call targets', () => {
    const baseRelation = {
      kind: 'call' as const,
      sourceId: 'call:run',
      fromFilePath: 'src/app.ts',
      fromSymbolId: 'src/app.ts:function:run',
      specifier: './lib',
    };

    expect(getRelationKey({ ...baseRelation, toFilePath: 'src/a.ts' })).not.toEqual(
      getRelationKey({ ...baseRelation, toFilePath: 'src/b.ts' }),
    );
  });

  it('merges defaults, plugin provenance, and projected connections', () => {
    const plugin = { id: 'plugin' } as IPlugin;
    const base = createEmptyFileAnalysisResult('src/app.ts');
    const pluginResult = withPluginProvenance(plugin, {
      filePath: '',
      edgeTypes: [{ id: 'import', label: 'Import', defaultColor: '#38BDF8', defaultVisible: true }],
      nodeTypes: [{ id: 'file', label: 'File', defaultColor: '#A1A1AA', defaultVisible: true }],
      nodes: [{ id: 'src/app.ts', nodeType: 'file', label: 'app.ts' }],
      relations: [{
        kind: 'import',
        sourceId: 'plugin:import',
        fromFilePath: 'src/app.ts',
        toFilePath: 'src/lib.ts',
        specifier: './lib',
      }],
      symbols: [{
        id: 'src/app.ts:function:run',
        name: 'run',
        kind: 'function',
        filePath: 'src/app.ts',
      }],
    });

    const merged = mergeFileAnalysisResults(base, pluginResult);
    const projected = toProjectedConnectionsFromFileAnalysis(merged);

    expect(merged.filePath).toBe('src/app.ts');
    expect(merged.edgeTypes).toEqual([
      { id: 'import', label: 'Import', defaultColor: '#38BDF8', defaultVisible: true },
    ]);
    expect(merged.nodeTypes).toEqual([
      { id: 'file', label: 'File', defaultColor: '#A1A1AA', defaultVisible: true },
    ]);
    expect(merged.nodes).toEqual([{ id: 'src/app.ts', nodeType: 'file', label: 'app.ts' }]);
    expect(merged.symbols).toEqual([
      { id: 'src/app.ts:function:run', name: 'run', kind: 'function', filePath: 'src/app.ts' },
    ]);
    expect(projected).toEqual([{
      kind: 'import',
      pluginId: 'plugin',
      sourceId: 'plugin:import',
      specifier: './lib',
      resolvedPath: 'src/lib.ts',
      type: undefined,
      variant: undefined,
      metadata: undefined,
    }]);
  });
});
