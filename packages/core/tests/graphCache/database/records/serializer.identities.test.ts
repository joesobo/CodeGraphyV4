import { describe, expect, it } from 'vitest';
import { serializeDatabaseRecords } from '../../../../src/graphCache/database/records/serializer';

describe('graphCache/database/serializer identities', () => {
  it('preserves parallel graph edges with distinct stable keys', () => {
    const records = serializeDatabaseRecords({ version: '1', files: {} }, {
      nodes: [
        { id: 'src/a.ts', nodeType: 'file', label: 'a.ts' },
        { id: 'src/b.ts', nodeType: 'file', label: 'b.ts' },
      ],
      edges: [
        { id: 'call:a-to-b:first', from: 'src/a.ts', to: 'src/b.ts', kind: 'call', sources: [] },
        { id: 'call:a-to-b:second', from: 'src/a.ts', to: 'src/b.ts', kind: 'call', sources: [] },
      ],
    });

    expect(records.edges).toEqual([
      {
        key: 'call:a-to-b:first',
        sourceNodeId: 'src/a.ts',
        targetNodeId: 'src/b.ts',
        type: 'call',
      },
      {
        key: 'call:a-to-b:second',
        sourceNodeId: 'src/a.ts',
        targetNodeId: 'src/b.ts',
        type: 'call',
      },
    ]);
  });

  it('gives parallel fallback relations distinct synthetic keys', () => {
    const records = serializeDatabaseRecords({
      version: '1',
      files: {
        'src/a.ts': {
          mtime: 1,
          analysis: {
            filePath: '/workspace/src/a.ts',
            relations: [
              {
                kind: 'call',
                sourceId: 'first-call',
                fromFilePath: '/workspace/src/a.ts',
                toFilePath: '/workspace/src/b.ts',
              },
              {
                kind: 'call',
                sourceId: 'second-call',
                fromFilePath: '/workspace/src/a.ts',
                toFilePath: '/workspace/src/b.ts',
              },
            ],
          },
        },
        'src/b.ts': {
          mtime: 1,
          analysis: { filePath: '/workspace/src/b.ts', relations: [] },
        },
      },
    });

    expect(records.edges.map(edge => edge.key)).toEqual([
      'src/a.ts->src/b.ts#call',
      'src/a.ts->src/b.ts#call:2',
    ]);
  });

  it('uses graph identities for analysis nodes and relation endpoints', () => {
    const metadataNodeId = '/workspace/.unity/prefab:player-guid';
    const graphNodeId = '.unity/prefab:player-guid';
    const records = serializeDatabaseRecords({
      version: '1',
      files: {
        'Assets/Player.prefab': {
          mtime: 1,
          analysis: {
            filePath: '/workspace/Assets/Player.prefab',
            nodes: [{
              id: metadataNodeId,
              filePath: '/workspace/Assets/Player.prefab',
              nodeType: 'plugin:codegraphy.unity:prefab',
              label: 'Player',
            }],
            relations: [{
              kind: 'contains',
              sourceId: 'unity-prefab',
              fromFilePath: '/workspace/Assets/Player.prefab',
              toFilePath: '/workspace/Assets/Player.prefab',
              toNodeId: metadataNodeId,
            }],
          },
        },
      },
    }, {
      nodes: [
        { id: 'Assets/Player.prefab', nodeType: 'file', label: 'Player.prefab' },
        { id: graphNodeId, nodeType: 'plugin:codegraphy.unity:prefab', label: 'Player' },
      ],
      edges: [{
        id: 'Assets/Player.prefab->.unity/prefab:player-guid#contains',
        from: 'Assets/Player.prefab',
        to: graphNodeId,
        kind: 'contains',
        sources: [],
      }],
    });

    expect(records.nodes.filter(node => node.label === 'Player')).toEqual([
      expect.objectContaining({ key: graphNodeId }),
    ]);
    expect(records.edges[0]).toEqual(expect.objectContaining({
      sourceNodeId: 'Assets/Player.prefab',
      targetNodeId: graphNodeId,
    }));
  });

  it('stores one node for raw and canonical forms of the same analysis symbol', () => {
    const records = serializeDatabaseRecords({
      version: '1',
      files: {
        'Assets/Player.prefab': {
          mtime: 1,
          analysis: {
            filePath: '/workspace/Assets/Player.prefab',
            symbols: [{
              id: 'Assets/Player.prefab#unity:game-object:1',
              filePath: '/workspace/Assets/Player.prefab',
              name: 'Player',
              kind: 'game-object',
              signature: 'GameObject 1',
            }],
          },
        },
      },
    }, {
      nodes: [{
        id: 'Assets/Player.prefab#Player:game-object:GameObject%201',
        nodeType: 'symbol',
        label: 'Player',
        symbol: {
          id: 'Assets/Player.prefab#Player:game-object:GameObject%201',
          filePath: 'Assets/Player.prefab',
          name: 'Player',
          kind: 'game-object',
          signature: 'GameObject 1',
        },
      }],
      edges: [],
    });

    expect(records.nodes).toHaveLength(2);
    expect(records.nodes.map(node => node.key)).toEqual([
      'Assets/Player.prefab',
      'Assets/Player.prefab#Player:game-object:GameObject%201',
    ]);
    expect(records.symbols).toHaveLength(1);
  });
});
