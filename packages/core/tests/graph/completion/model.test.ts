import { describe, expect, it } from 'vitest';
import { buildCompleteWorkspaceGraphData } from '../../../src/graph/completion/model';

describe('complete workspace graph', () => {
  it('keeps file, symbol, and plugin nodes independent of Graph Scope', () => {
    const graph = buildCompleteWorkspaceGraphData({
      cacheFiles: {
        'src/app.ts': { size: 10 },
        'src/model.ts': { size: 20 },
      },
      directoryPaths: ['src'],
      disabledPlugins: new Set(),
      fileAnalysis: new Map([
        ['src/app.ts', {
          filePath: '/workspace/src/app.ts',
          nodeTypes: [{
            id: 'plugin:test:route',
            label: 'Route',
            defaultColor: '#123456',
            defaultVisible: false,
          }],
          nodes: [{
            id: '/workspace/src/app.ts:route:home',
            nodeType: 'plugin:test:route',
            label: 'Home',
            filePath: '/workspace/src/app.ts',
          }, {
            id: 'src/app.ts#speed:field',
            nodeType: 'variable',
            label: 'speed',
            filePath: '/workspace/src/app.ts',
          }],
          symbols: [{
            id: '/workspace/src/app.ts:function:run',
            name: 'run',
            kind: 'function',
            filePath: '/workspace/src/app.ts',
          }, {
            id: '/workspace/src/app.ts:field:speed',
            name: 'speed',
            kind: 'field',
            filePath: '/workspace/src/app.ts',
          }],
          relations: [{
            kind: 'test:routes-to',
            pluginId: 'plugin.test',
            sourceId: 'route',
            fromFilePath: '/workspace/src/app.ts',
            fromNodeId: '/workspace/src/app.ts:route:home',
            toFilePath: '/workspace/src/model.ts',
          }],
        }],
        ['src/model.ts', { filePath: '/workspace/src/model.ts' }],
      ]),
      getPluginForFile: () => undefined,
      showOrphans: true,
      workspaceRoot: '/workspace',
    });

    expect(graph.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'src/app.ts' }),
      expect.objectContaining({
        id: 'src/app.ts#run:function',
        nodeType: 'symbol',
        symbol: expect.objectContaining({ name: 'run' }),
      }),
      expect.objectContaining({
        id: 'src/app.ts:route:home',
        nodeType: 'plugin:test:route',
        color: '#123456',
      }),
      expect.objectContaining({
        id: 'src/app.ts#speed:field',
        nodeType: 'variable',
        symbol: expect.objectContaining({ kind: 'field', name: 'speed' }),
      }),
    ]));
    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({
        from: 'src/app.ts:route:home',
        to: 'src/model.ts',
        kind: 'test:routes-to',
      }),
    ]));
  });
});
