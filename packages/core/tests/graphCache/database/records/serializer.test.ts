import { describe, expect, it, vi } from 'vitest';
import { serializeDatabaseRecords } from '../../../../src/graphCache/database/records/serializer';

describe('graphCache/database/serializer', () => {
  it('normalizes file-owned analysis IDs without scanning every known file mapping', () => {
    const mapIterations = vi.spyOn(Map.prototype, Symbol.iterator);

    serializeDatabaseRecords({
      version: '1',
      files: {
        'src/a.ts': {
          mtime: 1,
          analysis: {
            filePath: '/workspace/src/a.ts',
            symbols: [{
              id: '/workspace/src/a.ts#A',
              filePath: '/workspace/src/a.ts',
              name: 'A',
              kind: 'class',
            }],
          },
        },
        'src/b.ts': {
          mtime: 1,
          analysis: {
            filePath: '/workspace/src/b.ts',
            symbols: [{
              id: '/workspace/src/b.ts#B',
              filePath: '/workspace/src/b.ts',
              name: 'B',
              kind: 'class',
            }],
          },
        },
      },
    });

    expect(mapIterations).not.toHaveBeenCalled();
  });

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

  it('persists external package relations as owned analysis facts', () => {
    const records = serializeDatabaseRecords({
      version: '1',
      files: {
        'eslint.config.mjs': {
          mtime: 1,
          analysis: {
            filePath: '/workspace/eslint.config.mjs',
            relations: [{
              kind: 'import',
              sourceId: 'tree-sitter:import',
              fromFilePath: '/workspace/eslint.config.mjs',
              specifier: '@eslint/js',
            }],
          },
        },
      },
    }, {
      nodes: [
        { id: 'eslint.config.mjs', nodeType: 'file', label: 'eslint.config.mjs', color: '#fff' },
        { id: 'pkg:@eslint/js', nodeType: 'package', label: '@eslint/js', color: '#fff' },
      ],
      edges: [{
        id: 'eslint.config.mjs->pkg:@eslint/js#import',
        from: 'eslint.config.mjs',
        to: 'pkg:@eslint/js',
        kind: 'import',
        sources: [],
      }],
    });

    expect(records.nodes).toContainEqual(expect.objectContaining({
      key: 'pkg:@eslint/js',
      type: 'package',
    }));
    expect(records.edges).toContainEqual(expect.objectContaining({
      sourceNodeId: 'eslint.config.mjs',
      targetNodeId: 'pkg:@eslint/js',
      ownerFileId: 'eslint.config.mjs',
      relationSpecifier: '@eslint/js',
      analysisRelation: 1,
      canonicalGraphEdge: 1,
    }));
  });
});
