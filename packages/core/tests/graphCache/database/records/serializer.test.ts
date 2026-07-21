import { describe, expect, it } from 'vitest';
import { serializeDatabaseRecords } from '../../../../src/graphCache/database/records/serializer';

describe('graphCache/database/serializer', () => {
  it('normalizes files, nodes, symbols, and edge provenance without JSON', () => {
    const records = serializeDatabaseRecords({
      version: '1',
      files: {
        'src/app.ts': {
          mtime: 1,
          analysis: {
            filePath: '/workspace/src/app.ts',
            nodes: [{ id: '/workspace/src/app.ts#App', nodeType: 'component', label: 'App' }],
            symbols: [{
              id: '/workspace/src/app.ts#App',
              filePath: '/workspace/src/app.ts',
              kind: 'class',
              name: 'App',
            }],
            relations: [{
              kind: 'import',
              sourceId: 'tree-sitter:import',
              fromFilePath: '/workspace/src/app.ts',
              toFilePath: '/workspace/src/model.ts',
            }],
          },
        },
      },
    });

    expect(records.files).toEqual([expect.objectContaining({
      path: 'src/app.ts',
      analysisPath: '/workspace/src/app.ts',
    })]);
    expect(records.nodes).toContainEqual(expect.objectContaining({
      key: 'src/app.ts#App',
      type: 'component',
      analysisNodeId: '/workspace/src/app.ts#App',
    }));
    expect(records.symbols).toContainEqual(expect.objectContaining({
      nodeId: 'src/app.ts#App',
      analysisId: '/workspace/src/app.ts#App',
      kind: 'class',
    }));
    expect(records.edges).toContainEqual(expect.objectContaining({
      sourceNodeId: 'src/app.ts',
      targetNodeId: 'src/model.ts',
      analysisSourceId: 'tree-sitter:import',
      analysisRelation: 1,
      canonicalGraphEdge: 1,
    }));
    expect(JSON.stringify(records)).not.toMatch(/factsJson|propertiesJson|sourcesJson|provenanceJson/);
  });

  it('does not encode analysis cache bookkeeping as graph nodes or edges', () => {
    const records = serializeDatabaseRecords({
      version: '1',
      files: {
        'src/app.ts': {
          mtime: 1,
          analysis: {
            filePath: '/workspace/src/app.ts',
            cache: { tiers: ['baseline', 'symbols', 'plugin:codegraphy.typescript'] },
            relations: [],
            symbols: [],
          } as never,
        },
      },
    });

    expect(records.nodes.map(node => node.type)).not.toContain('codegraphy:cache-tier');
    expect(records.edges.map(edge => edge.type)).not.toContain('codegraphy:has-cache-tier');
  });
});
