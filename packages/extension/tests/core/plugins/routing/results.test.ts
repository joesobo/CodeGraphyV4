import { describe, expect, it } from 'vitest';
import type { IPlugin } from '../../../../../plugin-api/src';
import { getRelationKey } from '@codegraphy-dev/core';
import {
  createEmptyFileAnalysisResult,
  mergeFileAnalysisResults,
} from '@codegraphy-dev/core';
import {
  toProjectedConnectionsFromFileAnalysis,
  withPluginProvenance,
} from '@codegraphy-dev/core';

describe('routing/results', () => {
  it('builds distinct relation keys for resolved call targets', () => {
    const baseRelation = {
      edgeType: 'call' as const,
      sourceId: 'call:run',
      from: { kind: 'symbol' as const, symbolId: 'src/app.ts:function:run', filePath: 'src/app.ts' },
      specifier: './lib',
    };

    expect(getRelationKey('src/app.ts', { ...baseRelation, target: { kind: 'file', path: 'src/a.ts' } })).not.toEqual(
      getRelationKey('src/app.ts', { ...baseRelation, target: { kind: 'file', path: 'src/b.ts' } }),
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
        edgeType: 'import',
        sourceId: 'plugin:import',
        from: { kind: 'file', filePath: 'src/app.ts' },
        target: { kind: 'file', path: 'src/lib.ts', specifier: './lib' },
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
    const projected = toProjectedConnectionsFromFileAnalysis(merged, '');

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
