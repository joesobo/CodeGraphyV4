import { describe, expect, it } from 'vitest';
import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import type { IWorkspaceAnalysisCache } from '../../../../src/analysis/cache';
import { parseDatabaseRecords } from '../../../../src/graphCache/database/records/parser';
import { serializeDatabaseRecords } from '../../../../src/graphCache/database/records/serializer';

describe('graphCache/database/parser', () => {
  it('hydrates normalized rows without rescanning every row for each file', () => {
    let filePathReads = 0;
    const ownedNode = {
      id: 1,
      key: 'a.ts',
      type: 'file',
      label: 'a.ts',
      color: '#fff',
      get filePath() {
        filePathReads += 1;
        if (filePathReads > 2) throw new Error('node rows were rescanned');
        return 'a.ts';
      },
    };

    expect(() => parseDatabaseRecords(
      [
        { path: 'a.ts' },
        { path: 'b.ts' },
        { path: 'c.ts' },
      ],
      [ownedNode],
      [],
      [],
      '/workspace',
    )).not.toThrow();
  });

  it('reconstructs analysis facts without adding cache bookkeeping to the graph', () => {
    const analysis: IFileAnalysisResult & { cache: { tiers: string[] } } = {
      filePath: '/workspace/src/app.ts',
      cache: { tiers: ['baseline', 'symbols', 'plugin:vue'] },
      symbols: [{
        id: '/workspace/src/app.ts#App',
        filePath: '/workspace/src/app.ts',
        kind: 'class',
        name: 'App',
      }],
    };
    const cache: IWorkspaceAnalysisCache = {
      version: '1',
      files: {
        'src/app.ts': {
          mtime: 1,
          analysis,
        },
      },
    };
    const records = serializeDatabaseRecords(cache);
    const hydrated = parseDatabaseRecords(records.files, records.nodes, records.symbols, records.edges, '/workspace');

    expect(hydrated.files[0]?.analysis).toEqual({
      filePath: analysis.filePath,
      nodes: [],
      symbols: analysis.symbols,
      relations: [],
    });
    expect(hydrated.graph.nodes.map(node => node.nodeType)).not.toContain('codegraphy:cache-tier');
    expect(hydrated.graph.edges.map(edge => edge.kind)).not.toContain('codegraphy:has-cache-tier');
  });

  it('hydrates one canonical Edge row without serialized provenance', () => {
    const hydrated = parseDatabaseRecords(
      [],
      [
        { id: 1, key: 'a', type: 'file', label: 'a', color: '#fff' },
        { id: 2, key: 'b', type: 'file', label: 'b', color: '#fff' },
      ],
      [],
      [
        {
          key: 'a->b#import', sourceNodeKey: 'a', targetNodeKey: 'b', type: 'import',
        },
      ],
      '/workspace',
    );

    expect(hydrated.graph.edges).toEqual([expect.objectContaining({
      id: 'a->b#import',
      sources: [],
    })]);
  });

  it('resolves Symbol ownership through its Node File reference', () => {
    const records = serializeDatabaseRecords({
      version: '1',
      files: {
        'external.ts': {
          mtime: 0,
          analysis: { filePath: '/workspace/external.ts' },
        },
      },
    }, {
      nodes: [{
        id: 'external#run:function',
        label: 'run',
        color: '#fff',
        nodeType: 'symbol',
        symbol: {
          id: 'external#run:function',
          filePath: 'external.ts',
          name: 'run',
          kind: 'function',
        },
      }],
      edges: [],
    });

    expect(records.symbols).toEqual([
      expect.objectContaining({ nodeId: 'external#run:function' }),
    ]);
    const parsed = parseDatabaseRecords(records.files, records.nodes, records.symbols, records.edges, '/workspace');
    expect(parsed.symbols).toEqual([
      expect.objectContaining({ name: 'run', kind: 'function' }),
    ]);
    expect(parsed.graph.nodes.find(node => node.id === 'external#run:function')?.symbol)
      .toMatchObject({ name: 'run', kind: 'function' });
  });

  it('does not persist Edge provenance or analyzer metadata', () => {
    const records = serializeDatabaseRecords({
      version: '1',
      files: {
        'a.ts': {
          mtime: 1,
          analysis: {
            filePath: '/workspace/a.ts',
            relations: [{
              kind: 'import',
              sourceId: 'imports',
              fromFilePath: '/workspace/a.ts',
              toFilePath: '/workspace/b.ts',
              metadata: { language: 'relation-language' },
            }],
          },
        },
        'b.ts': { mtime: 1, analysis: { filePath: '/workspace/b.ts' } },
      },
    }, {
      nodes: [
        { id: 'a.ts', label: 'a.ts', color: '#fff', nodeType: 'file' },
        { id: 'b.ts', label: 'b.ts', color: '#fff', nodeType: 'file' },
      ],
      edges: [{
        id: 'a.ts->b.ts#import',
        from: 'a.ts',
        to: 'b.ts',
        kind: 'import',
        metadata: { language: 'edge-language' },
        sources: [{
          id: 'codegraphy.core:imports',
          pluginId: 'codegraphy.core',
          sourceId: 'imports',
          label: 'Imports',
          metadata: { language: 'source-language' },
        }],
      }],
    });

    const parsed = parseDatabaseRecords(records.files, records.nodes, records.symbols, records.edges, '/workspace');

    expect(parsed.graph.edges[0]).not.toHaveProperty('metadata');
    expect(parsed.graph.edges[0]?.sources).toEqual([]);
    expect(parsed.relations[0]).not.toHaveProperty('metadata');
  });
});
