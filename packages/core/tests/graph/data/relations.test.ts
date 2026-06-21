import { describe, expect, it } from 'vitest';
import { buildWorkspaceGraphDataFromAnalysis } from '../../../src/graph/data';
import { createPlugin, SYMBOL_NODE_VISIBILITY } from './fixture';


describe('core/graph/data symbol relations', () => {
  it('projects resolved symbol relations as symbol-to-symbol edges', () => {
    const graph = buildWorkspaceGraphDataFromAnalysis({
      cacheFiles: {
        'src/player.gd': { size: 20 },
      },
      disabledPlugins: new Set(),
      fileAnalysis: new Map([
        ['src/player.gd', {
          filePath: '/workspace/src/player.gd',
          symbols: [
            {
              id: '/workspace/src/player.gd:method:_ready',
              filePath: '/workspace/src/player.gd',
              kind: 'method',
              name: '_ready',
            },
            {
              id: '/workspace/src/player.gd:method:setup_input',
              filePath: '/workspace/src/player.gd',
              kind: 'method',
              name: 'setup_input',
            },
          ],
          relations: [{
            kind: 'call',
            pluginId: 'codegraphy.godot',
            sourceId: 'call',
            fromFilePath: '/workspace/src/player.gd',
            fromSymbolId: '/workspace/src/player.gd:method:_ready',
            toFilePath: '/workspace/src/player.gd',
            toSymbolId: '/workspace/src/player.gd:method:setup_input',
          }],
        }],
      ]),
      showOrphans: true,
      churnCounts: {},
      nodeVisibility: SYMBOL_NODE_VISIBILITY,
      workspaceRoot: '/workspace',
      getPluginForFile: () => createPlugin('codegraphy.godot'),
    });

    expect(graph.edges).toEqual(expect.arrayContaining([
      {
        id: 'src/player.gd#_ready:method->src/player.gd#setup_input:method#call',
        from: 'src/player.gd#_ready:method',
        to: 'src/player.gd#setup_input:method',
        kind: 'call',
        sources: [
          {
            id: 'codegraphy.godot:call',
            pluginId: 'codegraphy.godot',
            sourceId: 'call',
            label: 'call',
          },
        ],
      },
    ]));
  });

  it('resolves symbol relation targets from the relation specifier when the analyzer knows the target file', () => {
    const graph = buildWorkspaceGraphDataFromAnalysis({
      cacheFiles: {
        'src/runner.ts': { size: 10 },
        'src/base.ts': { size: 20 },
      },
      disabledPlugins: new Set(),
      fileAnalysis: new Map([
        ['src/runner.ts', {
          filePath: '/workspace/src/runner.ts',
          symbols: [{
            id: 'runner-symbol',
            filePath: '/workspace/src/runner.ts',
            kind: 'class',
            name: 'Runner',
          }],
          relations: [{
            kind: 'inherit',
            sourceId: 'core:treesitter:inherit',
            fromFilePath: '/workspace/src/runner.ts',
            fromSymbolId: 'runner-symbol',
            specifier: 'BaseRunner',
            toFilePath: '/workspace/src/base.ts',
          }],
        }],
        ['src/base.ts', {
          filePath: '/workspace/src/base.ts',
          symbols: [{
            id: 'base-symbol',
            filePath: '/workspace/src/base.ts',
            kind: 'class',
            name: 'BaseRunner',
          }],
          relations: [],
        }],
      ]),
      showOrphans: true,
      churnCounts: {},
      nodeVisibility: SYMBOL_NODE_VISIBILITY,
      workspaceRoot: '/workspace',
      getPluginForFile: () => undefined,
    });

    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'src/runner.ts#Runner:class->src/base.ts#BaseRunner:class#inherit',
        from: 'src/runner.ts#Runner:class',
        to: 'src/base.ts#BaseRunner:class',
        kind: 'inherit',
      }),
    ]));
  });

  it('projects symbol endpoint relations without duplicate file-level edges when symbols are enabled', () => {
    const graph = buildWorkspaceGraphDataFromAnalysis({
      cacheFiles: {
        'src/source.ts': { size: 10 },
        'src/target.ts': { size: 20 },
      },
      disabledPlugins: new Set(),
      fileAnalysis: new Map([
        ['src/source.ts', {
          filePath: '/workspace/src/source.ts',
          symbols: [{
            id: 'source-symbol',
            filePath: '/workspace/src/source.ts',
            kind: 'function',
            name: 'source',
          }],
          relations: [{
            kind: 'import',
            pluginId: 'plugin.symbols',
            sourceId: 'es6-import',
            fromFilePath: '/workspace/src/source.ts',
            fromSymbolId: 'source-symbol',
            toFilePath: '/workspace/src/target.ts',
            toSymbolId: 'target-symbol',
          }],
        }],
        ['src/target.ts', {
          filePath: '/workspace/src/target.ts',
          symbols: [{
            id: 'target-symbol',
            filePath: '/workspace/src/target.ts',
            kind: 'function',
            name: 'target',
          }],
          relations: [],
        }],
      ]),
      showOrphans: true,
      churnCounts: {},
      nodeVisibility: SYMBOL_NODE_VISIBILITY,
      workspaceRoot: '/workspace',
      getPluginForFile: () => createPlugin('plugin.symbols'),
    });

    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'src/source.ts#source:function->src/target.ts#target:function#import',
        from: 'src/source.ts#source:function',
        to: 'src/target.ts#target:function',
        kind: 'import',
      }),
    ]));
    expect(graph.edges).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'src/source.ts->src/target.ts#import',
        from: 'src/source.ts',
        to: 'src/target.ts',
        kind: 'import',
      }),
    ]));
  });

  it('keeps file-level fallback edges for symbol endpoint relations when symbols are disabled', () => {
    const graph = buildWorkspaceGraphDataFromAnalysis({
      cacheFiles: {
        'src/source.ts': { size: 10 },
        'src/target.ts': { size: 20 },
      },
      disabledPlugins: new Set(),
      fileAnalysis: new Map([
        ['src/source.ts', {
          filePath: '/workspace/src/source.ts',
          symbols: [{
            id: 'source-symbol',
            filePath: '/workspace/src/source.ts',
            kind: 'function',
            name: 'source',
          }],
          relations: [{
            kind: 'import',
            pluginId: 'plugin.symbols',
            sourceId: 'es6-import',
            fromFilePath: '/workspace/src/source.ts',
            fromSymbolId: 'source-symbol',
            toFilePath: '/workspace/src/target.ts',
            toSymbolId: 'target-symbol',
          }],
        }],
        ['src/target.ts', {
          filePath: '/workspace/src/target.ts',
          symbols: [{
            id: 'target-symbol',
            filePath: '/workspace/src/target.ts',
            kind: 'function',
            name: 'target',
          }],
          relations: [],
        }],
      ]),
      showOrphans: true,
      churnCounts: {},
      nodeVisibility: { symbol: false },
      workspaceRoot: '/workspace',
      getPluginForFile: () => createPlugin('plugin.symbols'),
    });

    expect(graph.edges).toEqual([
      expect.objectContaining({
        id: 'src/source.ts->src/target.ts#import',
        from: 'src/source.ts',
        to: 'src/target.ts',
        kind: 'import',
      }),
    ]);
  });

  it('keeps symbol relations with file targets while dropping unresolved symbol relations', () => {
    const graph = buildWorkspaceGraphDataFromAnalysis({
      cacheFiles: {
        'src/source.ts': { size: 10 },
        'src/target.ts': { size: 20 },
      },
      disabledPlugins: new Set(),
      fileAnalysis: new Map([
        ['src/source.ts', {
          filePath: '/workspace/src/source.ts',
          symbols: [{
            id: 'source-symbol',
            filePath: '/workspace/src/source.ts',
            kind: 'function',
            name: 'source',
          }],
          relations: [
            {
              kind: 'reference',
              pluginId: 'plugin.symbols',
              sourceId: 'reference',
              fromFilePath: '/workspace/src/source.ts',
              fromSymbolId: 'source-symbol',
              toFilePath: '/workspace/src/target.ts',
            },
            {
              kind: 'reference',
              pluginId: 'plugin.symbols',
              sourceId: 'missing-reference',
              fromFilePath: '/workspace/src/source.ts',
              fromSymbolId: 'source-symbol',
            },
          ],
        }],
        ['src/target.ts', {
          filePath: '/workspace/src/target.ts',
          relations: [],
        }],
      ]),
      showOrphans: true,
      churnCounts: {},
      nodeVisibility: SYMBOL_NODE_VISIBILITY,
      workspaceRoot: '/workspace',
      getPluginForFile: () => createPlugin('plugin.symbols'),
    });

    expect(graph.edges).toEqual(expect.arrayContaining([
      {
        id: 'src/source.ts#source:function->src/target.ts#reference',
        from: 'src/source.ts#source:function',
        to: 'src/target.ts',
        kind: 'reference',
        sources: [
          {
            id: 'plugin.symbols:reference',
            pluginId: 'plugin.symbols',
            sourceId: 'reference',
            label: 'reference',
          },
        ],
      },
    ]));
    expect(graph.edges.map((edge) => edge.id)).not.toContain(
      'src/source.ts#source:function->undefined#reference',
    );
  });
});
