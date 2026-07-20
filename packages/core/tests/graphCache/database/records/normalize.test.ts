import { describe, expect, it } from 'vitest';
import { normalizeDatabaseRecords } from '../../../../src/graphCache/database/records/normalize';

describe('graphCache/database/normalize', () => {
  it('normalizes files, collocated node and symbol facts, and edge provenance without JSON', () => {
    const records = normalizeDatabaseRecords({
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
      nodesIndexed: 1,
      symbolsIndexed: 1,
      relationsIndexed: 1,
    })]);
    expect(records.nodes).toContainEqual(expect.objectContaining({
      id: 'src/app.ts#App',
      type: 'component',
      analysisNodeId: '/workspace/src/app.ts#App',
      analysisSymbolId: '/workspace/src/app.ts#App',
      symbolKind: 'class',
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
});
