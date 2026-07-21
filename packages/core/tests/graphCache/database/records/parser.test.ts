import { describe, expect, it } from 'vitest';
import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import type { IWorkspaceAnalysisCache } from '../../../../src/analysis/cache';
import { parseDatabaseRecords } from '../../../../src/graphCache/database/records/parser';
import { serializeDatabaseRecords } from '../../../../src/graphCache/database/records/serializer';

describe('graphCache/database/parser', () => {
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
    const hydrated = parseDatabaseRecords(records.files, records.nodes, records.edges);

    expect(hydrated.files[0]?.analysis).toEqual({
      cache: { tiers: ['baseline', 'symbols'] },
      filePath: analysis.filePath,
      symbols: analysis.symbols,
    });
    expect(hydrated.graph.nodes.map(node => node.nodeType)).not.toContain('codegraphy:cache-tier');
    expect(hydrated.graph.edges.map(edge => edge.kind)).not.toContain('codegraphy:has-cache-tier');
  });

  it('groups physical source rows into one canonical multi-source edge', () => {
    const hydrated = parseDatabaseRecords(
      [],
      [
        { id: 'a', type: 'file', label: 'a', color: '#fff' },
        { id: 'b', type: 'file', label: 'b', color: '#fff' },
      ],
      [
        {
          id: 'edge-source-one', graphId: 'a->b#import', sourceNodeId: 'a', targetNodeId: 'b',
          type: 'import', sourcePluginId: 'one', sourceKey: 'one:import',
          pluginSourceId: 'import', sourceLabel: 'One', canonicalGraphEdge: 1,
        },
        {
          id: 'edge-source-two', graphId: 'a->b#import', sourceNodeId: 'a', targetNodeId: 'b',
          type: 'import', sourcePluginId: 'two', sourceKey: 'two:import',
          pluginSourceId: 'import', sourceLabel: 'Two', canonicalGraphEdge: 1,
        },
      ],
    );

    expect(hydrated.graph.edges).toEqual([expect.objectContaining({
      id: 'a->b#import',
      sources: [
        expect.objectContaining({ id: 'one:import', pluginId: 'one' }),
        expect.objectContaining({ id: 'two:import', pluginId: 'two' }),
      ],
    })]);
  });

  it('keeps edge, source, and analysis-relation metadata in their own roles', () => {
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

    const parsed = parseDatabaseRecords(records.files, records.nodes, records.edges);

    expect(parsed.graph.edges[0]?.metadata).toEqual({ language: 'edge-language' });
    expect(parsed.graph.edges[0]?.sources[0]?.metadata).toEqual({ language: 'source-language' });
    expect(parsed.relations[0]?.metadata).toEqual({ language: 'relation-language' });
  });
});
