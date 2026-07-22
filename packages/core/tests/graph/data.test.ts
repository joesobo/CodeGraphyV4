import { describe, expect, it } from 'vitest';
import { DEFAULT_NODE_COLOR } from '../../src/fileColors';
import { buildWorkspaceGraphDataFromAnalysis } from '../../src/graph/data';
import { createPlugin, SYMBOL_NODE_VISIBILITY } from './data/fixture';


describe('core/graph/data symbol nodes', () => {
  it('projects analysis symbols as symbol nodes contained by their files', () => {
    const graph = buildWorkspaceGraphDataFromAnalysis({
      cacheFiles: {
        'src/player.gd': { size: 20 },
      },
      disabledPlugins: new Set(),
      fileAnalysis: new Map([
        ['/workspace/src/player.gd', {
          filePath: '/workspace/src/player.gd',
          symbols: [{
            id: '/workspace/src/player.gd:method:_ready',
            filePath: '/workspace/src/player.gd',
            kind: 'method',
            name: '_ready',
            metadata: {
              language: 'gdscript',
              source: 'codegraphy.gdscript',
              pluginKind: 'godot-class-name',
            },
            range: {
              startLine: 3,
              startColumn: 1,
              endLine: 5,
              endColumn: 8,
            },
          }],
          relations: [],
        }],
      ]),
      showOrphans: true,
      nodeVisibility: SYMBOL_NODE_VISIBILITY,
      workspaceRoot: '/workspace',
      getPluginForFile: () => createPlugin('codegraphy.godot'),
    });

    expect(graph.nodes).toEqual([
      {
        id: 'src/player.gd',
        label: 'player.gd',
        fileSize: 20,
      },
      {
        id: 'src/player.gd#_ready:method',
        label: '_ready',
        fileSize: 20,
        nodeType: 'symbol',
        symbol: {
          id: 'src/player.gd#_ready:method',
          name: '_ready',
          kind: 'method',
          filePath: 'src/player.gd',
          language: 'gdscript',
          source: 'codegraphy.gdscript',
          pluginKind: 'godot-class-name',
          range: {
            startLine: 3,
            startColumn: 1,
            endLine: 5,
            endColumn: 8,
          },
        },
      },
    ]);
    expect(graph.edges).toEqual([
      {
        id: 'src/player.gd->src/player.gd#_ready:method#contains',
        from: 'src/player.gd',
        to: 'src/player.gd#_ready:method',
        kind: 'contains',
        sources: [],
      },
    ]);
  });

  it('does not project symbol nodes when the symbol graph scope is disabled', () => {
    const graph = buildWorkspaceGraphDataFromAnalysis({
      cacheFiles: {},
      disabledPlugins: new Set(),
      fileAnalysis: new Map([
        ['generated/virtual.ts', {
          filePath: '/workspace/generated/virtual.ts',
          symbols: [{
            id: 'virtual-symbol',
            filePath: '/workspace/generated/virtual.ts',
            kind: 'function',
            name: 'virtual',
          }],
          relations: [],
        }],
      ]),
      nodeVisibility: {
        file: true,
        symbol: false,
      },
      showOrphans: false,
      workspaceRoot: '/workspace',
      getPluginForFile: () => createPlugin('codegraphy.typescript'),
    });

    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
  });

  it('does not project symbol nodes when graph scope has no symbol visibility setting', () => {
    const graph = buildWorkspaceGraphDataFromAnalysis({
      cacheFiles: {},
      disabledPlugins: new Set(),
      fileAnalysis: new Map([
        ['generated/virtual.ts', {
          filePath: '/workspace/generated/virtual.ts',
          symbols: [{
            id: 'virtual-symbol',
            filePath: '/workspace/generated/virtual.ts',
            kind: 'function',
            name: 'virtual',
          }],
          relations: [],
        }],
      ]),
      showOrphans: false,
      workspaceRoot: '/workspace',
      getPluginForFile: () => createPlugin('codegraphy.typescript'),
    });

    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
  });

  it('creates containing file nodes for symbol-only analysis outside the discovered cache', () => {
    const graph = buildWorkspaceGraphDataFromAnalysis({
      cacheFiles: {},
      disabledPlugins: new Set(),
      fileAnalysis: new Map([
        ['generated/virtual.ts', {
          filePath: '/workspace/generated/virtual.ts',
          symbols: [{
            id: 'virtual-symbol',
            filePath: '/workspace/generated/virtual.ts',
            kind: 'function',
            name: 'virtual',
          }],
          relations: [],
        }],
      ]),
      showOrphans: false,
      nodeVisibility: SYMBOL_NODE_VISIBILITY,
      workspaceRoot: '/workspace',
      getPluginForFile: () => createPlugin('codegraphy.typescript'),
    });

    expect(graph.nodes).toEqual([
      {
        id: 'generated/virtual.ts',
        label: 'virtual.ts',
        fileSize: undefined,
      },
      {
        id: 'generated/virtual.ts#virtual:function',
        label: 'virtual',
        fileSize: undefined,
        nodeType: 'symbol',
        symbol: {
          id: 'generated/virtual.ts#virtual:function',
          name: 'virtual',
          kind: 'function',
          filePath: 'generated/virtual.ts',
        },
      },
    ]);
  });
});
