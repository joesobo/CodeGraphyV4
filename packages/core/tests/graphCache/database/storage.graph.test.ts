import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    WORKSPACE_ANALYSIS_CACHE_VERSION,
} from '../../../src/analysis/cache';
import {
    readRowsSync,
    withConnection,
} from '../../../src/graphCache/database/io/connection';
import {
    getWorkspaceAnalysisDatabasePath,
    loadWorkspaceAnalysisDatabaseCache,
    saveWorkspaceAnalysisDatabaseCache,
} from '../../../src/graphCache/database/storage';

import { createWorkspaceRoot } from './storage/fixture';

describe('workspace analysis database cache', { timeout: 30000 }, () => {

  it('persists indexing state and the canonical property graph in normalized queryable tables', () => {
    const workspaceRoot = createWorkspaceRoot();
    const analysis = {
      filePath: '/workspace/src/index.ts',
      nodeTypes: [{
        id: 'plugin:test:route',
        label: 'Route',
        defaultColor: '#123456',
        defaultVisible: true,
      }],
      edgeTypes: [{
        id: 'test:routes-to' as const,
        label: 'Routes to',
        defaultColor: '#654321',
        defaultVisible: false,
      }],
      nodes: [{
        id: '/workspace/src/index.ts:route:home',
        nodeType: 'plugin:test:route',
        label: 'Home',
        filePath: '/workspace/src/index.ts',
      }],
      symbols: [{
        id: '/workspace/src/index.ts:function:main',
        filePath: '/workspace/src/index.ts',
        kind: 'function',
        name: 'main',
      }],
      relations: [{
        kind: 'import' as const,
        sourceId: 'core:treesitter:import',
        fromFilePath: '/workspace/src/index.ts',
        toFilePath: '/workspace/src/utils.ts',
      }],
    };

    saveWorkspaceAnalysisDatabaseCache(workspaceRoot, {
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {
        'src/index.ts': { mtime: 1, size: 2, analysis },
      },
    }, {
      nodes: [
        {
          id: 'src/index.ts',
          label: 'index.ts',
          color: '#ffffff',
          nodeType: 'file',
          fileSize: 2,
        },
        {
          id: 'src/index.ts:function:main',
          label: 'main',
          color: '#ffffff',
          nodeType: 'symbol',
          symbol: {
            id: 'src/index.ts:function:main',
            filePath: 'src/index.ts',
            kind: 'function',
            name: 'main',
          },
        },
        {
          id: 'src/utils.ts',
          label: 'utils.ts',
          color: '#ffffff',
          nodeType: 'file',
        },
      ],
      edges: [{
        id: 'src/index.ts->src/utils.ts#import',
        from: 'src/index.ts',
        to: 'src/utils.ts',
        kind: 'import',
        sources: [{
          id: 'core:treesitter:import',
          pluginId: 'core',
          sourceId: 'treesitter:import',
          label: 'TypeScript import',
        }],
      }],
    });

    const records = withConnection(
      getWorkspaceAnalysisDatabasePath(workspaceRoot),
      connection => ({
        tables: readRowsSync(connection, "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"),
        files: readRowsSync(connection, 'SELECT id, path, mtime, size, contentHash FROM File'),
        nodes: readRowsSync(connection, `SELECT Node.*, File.path AS filePath,
          Parent.key AS parentKey
          FROM Node
          LEFT JOIN File ON File.id = Node.fileId
          LEFT JOIN Node AS Parent ON Parent.id = Node.parentId
          ORDER BY Node.id`),
        nodeViews: readRowsSync(connection, 'SELECT * FROM NodeView ORDER BY nodeKey'),
        symbols: readRowsSync(connection, `SELECT Symbol.*, Node.key AS nodeKey
          FROM Symbol JOIN Node ON Node.id = Symbol.nodeId ORDER BY Symbol.nodeId`),
        edges: readRowsSync(connection, `SELECT Edge.*, Source.key AS sourceNodeKey,
          Target.key AS targetNodeKey
          FROM Edge
          JOIN Node AS Source ON Source.id = Edge.sourceNodeId
          JOIN Node AS Target ON Target.id = Edge.targetNodeId`),
      }),
    );

    expect(records.tables).toEqual([
      { name: 'Edge' },
      { name: 'File' },
      { name: 'Node' },
      { name: 'NodeView' },
      { name: 'Symbol' },
    ]);
    expect(records.files).toEqual([{
      id: 1,
      path: 'src/index.ts',
      mtime: 1,
      size: 2,
      contentHash: null,
    }]);
    expect(records.nodes).toEqual([
      {
        id: 1,
        key: 'src/index.ts',
        type: 'file',
        label: 'index.ts',
        fileId: 1,
        filePath: 'src/index.ts',
        parentId: null,
        parentKey: null,
        pluginId: null,
        language: null,
      },
      {
        id: 2,
        key: 'src/index.ts:function:main',
        type: 'symbol:function',
        label: 'main',
        fileId: 1,
        filePath: 'src/index.ts',
        parentId: null,
        parentKey: null,
        pluginId: null,
        language: null,
      },
      {
        id: 3,
        key: 'src/index.ts:route:home',
        type: 'plugin:test:route',
        label: 'Home',
        fileId: 1,
        filePath: 'src/index.ts',
        parentId: null,
        parentKey: null,
        pluginId: null,
        language: null,
      },
      {
        id: 4,
        key: 'src/utils.ts',
        type: 'file',
        label: 'utils.ts',
        fileId: null,
        filePath: null,
        parentId: null,
        parentKey: null,
        pluginId: null,
        language: null,
      },
    ]);
    expect(records.nodeViews).toEqual([
      {
        nodeKey: 'src/index.ts',
        color: '#ffffff',
        x: null,
        y: null,
        favorite: 0,
        shape: null,
        imageUrl: null,
        isCollapsed: 0,
      },
      {
        nodeKey: 'src/index.ts:function:main',
        color: '#ffffff',
        x: null,
        y: null,
        favorite: 0,
        shape: null,
        imageUrl: null,
        isCollapsed: 0,
      },
      {
        nodeKey: 'src/utils.ts',
        color: '#ffffff',
        x: null,
        y: null,
        favorite: 0,
        shape: null,
        imageUrl: null,
        isCollapsed: 0,
      },
    ]);
    expect(records.symbols).toEqual([{
      nodeId: 2,
      nodeKey: 'src/index.ts:function:main',
      name: 'main',
      kind: 'function',
      pluginId: null,
      language: null,
    }]);
    expect(records.edges).toEqual([{
      id: 1,
      key: 'src/index.ts->src/utils.ts#import',
      sourceNodeId: 1,
      sourceNodeKey: 'src/index.ts',
      targetNodeId: 4,
      targetNodeKey: 'src/utils.ts',
      type: 'import',
    }]);
    expect(loadWorkspaceAnalysisDatabaseCache(workspaceRoot).files['src/index.ts'])
      .toMatchObject({
        mtime: 1,
        size: 2,
        analysis: {
          filePath: path.join(workspaceRoot, 'src/index.ts'),
          nodes: [expect.objectContaining({
            nodeType: 'plugin:test:route',
            label: 'Home',
          })],
          symbols: [expect.objectContaining({ name: 'main', kind: 'function' })],
          relations: [expect.objectContaining({ kind: 'import' })],
        },
    });
  });
});
