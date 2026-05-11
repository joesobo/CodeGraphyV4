import { describe, expect, it, vi } from 'vitest';
import type { IProjectedConnection, IPlugin } from '../../../../src/core/plugins/types/contracts';
import { DEFAULT_FOLDER_NODE_COLOR, DEFAULT_NODE_COLOR } from '../../../../src/shared/fileColors';
import {
  buildWorkspaceGraphData,
  buildWorkspaceGraphDataFromAnalysis,
} from '../../../../src/extension/pipeline/graph/data';

function createPlugin(id: string): IPlugin {
  return {
    id,
    name: id,
    version: '1.0.0',
    apiVersion: '^3.0.0',
    supportedExtensions: ['.ts'],
    sources: [
      { id: 'es6-import', name: 'ES6 import', description: 'ES module import' },
      { id: 'dynamic-import', name: 'Dynamic import', description: 'Dynamic import()' },
      { id: 'reexport', name: 'Re-export', description: 'Export from relation' },
    ],
    analyzeFile: vi.fn(async (filePath: string) => ({ filePath, relations: [] })),
  } as IPlugin;
}

describe('pipeline/graph/data', () => {
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
      churnCounts: {
        'src/player.gd': 4,
      },
      workspaceRoot: '/workspace',
      getPluginForFile: () => createPlugin('codegraphy.godot'),
    });

    expect(graph.nodes).toEqual([
      {
        id: 'src/player.gd',
        label: 'player.gd',
        color: DEFAULT_NODE_COLOR,
        fileSize: 20,
        churn: 4,
      },
      {
        id: 'src/player.gd#_ready:method',
        label: '_ready',
        color: '#8B5CF6',
        fileSize: 20,
        churn: 4,
        nodeType: 'symbol',
        symbol: {
          id: 'src/player.gd#_ready:method',
          name: '_ready',
          kind: 'method',
          filePath: 'src/player.gd',
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

  it('keeps file-level connections when the same relation resolves to symbol endpoints', () => {
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
      workspaceRoot: '/workspace',
      getPluginForFile: () => createPlugin('plugin.symbols'),
    });

    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'src/source.ts->src/target.ts#import',
        from: 'src/source.ts',
        to: 'src/target.ts',
        kind: 'import',
      }),
      expect.objectContaining({
        id: 'src/source.ts#source:function->src/target.ts#target:function#import',
        from: 'src/source.ts#source:function',
        to: 'src/target.ts#target:function',
        kind: 'import',
      }),
    ]));
  });

  it('adds deterministic suffixes for duplicate symbols without signatures', () => {
    const graph = buildWorkspaceGraphDataFromAnalysis({
      cacheFiles: {
        'src/app.ts': { size: 20 },
      },
      disabledPlugins: new Set(),
      fileAnalysis: new Map([
        ['src/app.ts', {
          filePath: '/workspace/src/app.ts',
          symbols: [
            {
              id: 'first-run',
              filePath: '/workspace/src/app.ts',
              kind: 'function',
              name: 'run',
            },
            {
              id: 'second-run',
              filePath: '/workspace/src/app.ts',
              kind: 'function',
              name: 'run',
            },
          ],
          relations: [],
        }],
      ]),
      showOrphans: true,
      churnCounts: {},
      workspaceRoot: '/workspace',
      getPluginForFile: () => createPlugin('codegraphy.typescript'),
    });

    expect(graph.nodes.map((item) => item.id)).toEqual([
      'src/app.ts',
      'src/app.ts#run:function',
      'src/app.ts#run:function:2',
    ]);
  });

  it('normalizes symbol paths, kinds, signatures, and variable node appearance', () => {
    const graph = buildWorkspaceGraphDataFromAnalysis({
      cacheFiles: {
        'src/player.gd': { size: 20 },
      },
      disabledPlugins: new Set(),
      fileAnalysis: new Map([
        ['src\\player.gd', {
          filePath: '/workspace/src/player.gd',
          symbols: [{
            id: 'score-symbol',
            filePath: '/workspace/src/player.gd',
            kind: '  Property  ',
            name: 'score',
            signature: 'var score: int',
          }],
          relations: [],
        }],
      ]),
      showOrphans: true,
      churnCounts: {},
      workspaceRoot: '/workspace',
      getPluginForFile: () => createPlugin('codegraphy.godot'),
    });

    expect(graph.nodes).toEqual(expect.arrayContaining([
      {
        id: 'src/player.gd#score:property:var%20score%3A%20int',
        label: 'score',
        color: '#14B8A6',
        fileSize: 20,
        churn: 0,
        nodeType: 'variable',
        symbol: {
          id: 'src/player.gd#score:property:var%20score%3A%20int',
          name: 'score',
          kind: 'property',
          filePath: 'src/player.gd',
          signature: 'var score: int',
        },
      },
    ]));
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

  it('keeps file-level relation edges while adding symbol relation edges without plugin sources', () => {
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
              kind: 'import',
              pluginId: 'plugin.symbols',
              sourceId: 'es6-import',
              fromFilePath: '/workspace/src/source.ts',
              toFilePath: '/workspace/src/target.ts',
            },
            {
              kind: 'reference',
              sourceId: 'reference',
              fromFilePath: '/workspace/src/source.ts',
              fromSymbolId: 'source-symbol',
              toFilePath: '/workspace/src/target.ts',
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
      workspaceRoot: '/workspace',
      getPluginForFile: () => createPlugin('plugin.symbols'),
    });

    const fileLevelEdges = graph.edges.filter((edge) => edge.from === 'src/source.ts' && edge.to === 'src/target.ts');
    expect(fileLevelEdges).toEqual([
      expect.objectContaining({
        kind: 'import',
        sources: [
          expect.objectContaining({
            label: 'ES6 import',
            sourceId: 'es6-import',
          }),
        ],
      }),
      expect.objectContaining({
        kind: 'reference',
        sources: [
          expect.objectContaining({
            label: 'reference',
            sourceId: 'reference',
          }),
        ],
      }),
    ]);
    expect(graph.edges).toEqual(expect.arrayContaining([
      {
        id: 'src/source.ts#source:function->src/target.ts#reference',
        from: 'src/source.ts#source:function',
        to: 'src/target.ts',
        kind: 'reference',
        sources: [],
      },
    ]));
  });

  it('builds connected nodes and edges with cached size and churn counts', () => {
    const typescriptPlugin = createPlugin('plugin.typescript');
    const fileConnections = new Map<string, IProjectedConnection[]>([
      ['src/index.ts', [{ specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', sourceId: 'es6-import' }]],
      ['src/utils.ts', []],
    ]);

    const graph = buildWorkspaceGraphData({
      cacheFiles: {
        'src/index.ts': { size: 10 },
        'src/utils.ts': { size: 20 },
      },
      disabledPlugins: new Set(),
      fileConnections,
      showOrphans: true,
      churnCounts: {
        'src/index.ts': 2,
      },
      workspaceRoot: '/workspace',
      getPluginForFile: () => typescriptPlugin,
    });

    expect(graph.nodes).toEqual([
      {
        id: 'src/index.ts',
        label: 'index.ts',
        color: DEFAULT_NODE_COLOR,
        fileSize: 10,
        churn: 2,
      },
      {
        id: 'src/utils.ts',
        label: 'utils.ts',
        color: DEFAULT_NODE_COLOR,
        fileSize: 20,
        churn: 0,
      },
    ]);
    expect(graph.edges).toEqual([
      {
        id: 'src/index.ts->src/utils.ts#import',
        from: 'src/index.ts',
        to: 'src/utils.ts',
        kind: 'import',
        sources: [
          {
            id: 'plugin.typescript:es6-import',
            pluginId: 'plugin.typescript',
            sourceId: 'es6-import',
            label: 'ES6 import',
          },
        ],
      },
    ]);
  });

  it('filters disabled plugins but keeps source-level provenance', () => {
    const typescriptPlugin = createPlugin('plugin.typescript');
    const pythonPlugin = createPlugin('plugin.python');
    const fileConnections = new Map<string, IProjectedConnection[]>([
      ['src/index.ts', [
        { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', sourceId: 'es6-import' },
        { specifier: './lazy', resolvedPath: '/workspace/src/lazy.ts', kind: 'import', sourceId: 'dynamic-import' },
      ]],
      ['src/utils.ts', []],
      ['src/lazy.ts', []],
      ['main.py', [{ specifier: 'config', resolvedPath: '/workspace/config.py', kind: 'import', sourceId: 'import-module' }]],
      ['config.py', []],
    ]);

    const graph = buildWorkspaceGraphData({
      cacheFiles: {},
      disabledPlugins: new Set(['plugin.python']),
      fileConnections,
      showOrphans: true,
      churnCounts: {},
      workspaceRoot: '/workspace',
      getPluginForFile: (absolutePath) => {
        if (absolutePath.endsWith('.py')) {
          return pythonPlugin;
        }
        return typescriptPlugin;
      },
    });

    expect(graph.edges).toEqual([
      {
        id: 'src/index.ts->src/utils.ts#import',
        from: 'src/index.ts',
        to: 'src/utils.ts',
        kind: 'import',
        sources: [
          {
            id: 'plugin.typescript:es6-import',
            pluginId: 'plugin.typescript',
            sourceId: 'es6-import',
            label: 'ES6 import',
          },
        ],
      },
      {
        id: 'src/index.ts->src/lazy.ts#import',
        from: 'src/index.ts',
        to: 'src/lazy.ts',
        kind: 'import',
        sources: [
          {
            id: 'plugin.typescript:dynamic-import',
            pluginId: 'plugin.typescript',
            sourceId: 'dynamic-import',
            label: 'Dynamic import',
          },
        ],
      },
    ]);
  });

  it('deduplicates repeated same-kind edges and accumulates distinct sources', () => {
    const typescriptPlugin = createPlugin('plugin.typescript');
    const fileConnections = new Map<string, IProjectedConnection[]>([
      ['src/index.ts', [
        { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', sourceId: 'es6-import' },
        { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'reexport', sourceId: 'reexport' },
        { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'reexport', sourceId: 'reexport' },
      ]],
      ['src/utils.ts', []],
    ]);

    const graph = buildWorkspaceGraphData({
      cacheFiles: {},
      disabledPlugins: new Set(),
      fileConnections,
      showOrphans: true,
      churnCounts: {},
      workspaceRoot: '/workspace',
      getPluginForFile: () => typescriptPlugin,
    });

    expect(graph.edges).toEqual([
      {
        id: 'src/index.ts->src/utils.ts#import',
        from: 'src/index.ts',
        to: 'src/utils.ts',
        kind: 'import',
        sources: [
          {
            id: 'plugin.typescript:es6-import',
            pluginId: 'plugin.typescript',
            sourceId: 'es6-import',
            label: 'ES6 import',
          },
        ],
      },
      {
        id: 'src/index.ts->src/utils.ts#reexport',
        from: 'src/index.ts',
        to: 'src/utils.ts',
        kind: 'reexport',
        sources: [
          {
            id: 'plugin.typescript:reexport',
            pluginId: 'plugin.typescript',
            sourceId: 'reexport',
            label: 'Re-export',
          },
        ],
      },
    ]);
  });

  it('hides orphan nodes and removes edges to missing targets', () => {
    const typescriptPlugin = createPlugin('plugin.typescript');
    const fileConnections = new Map<string, IProjectedConnection[]>([
      ['src/index.ts', [
        { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', sourceId: 'es6-import' },
        { specifier: './missing', resolvedPath: '/workspace/src/missing.ts', kind: 'import', sourceId: 'es6-import' },
      ]],
      ['src/utils.ts', []],
      ['src/orphan.ts', []],
    ]);

    const graph = buildWorkspaceGraphData({
      cacheFiles: {},
      disabledPlugins: new Set(),
      fileConnections,
      showOrphans: false,
      churnCounts: {},
      workspaceRoot: '/workspace',
      getPluginForFile: () => typescriptPlugin,
    });

    expect(graph.nodes.map((node) => node.id)).toEqual(['src/index.ts', 'src/utils.ts']);
    expect(graph.edges).toEqual([
      {
        id: 'src/index.ts->src/utils.ts#import',
        from: 'src/index.ts',
        to: 'src/utils.ts',
        kind: 'import',
        sources: [
          {
            id: 'plugin.typescript:es6-import',
            pluginId: 'plugin.typescript',
            sourceId: 'es6-import',
            label: 'ES6 import',
          },
        ],
      },
    ]);
  });

  it('returns no edges when connections have no resolved path', () => {
    const graph = buildWorkspaceGraphData({
      cacheFiles: {},
      disabledPlugins: new Set(),
      fileConnections: new Map<string, IProjectedConnection[]>([
        ['src/index.ts', [{ specifier: './utils', resolvedPath: null, kind: 'import', sourceId: 'es6-import' }]],
        ['src/utils.ts', []],
      ]),
      showOrphans: true,
      churnCounts: {},
      workspaceRoot: '/workspace',
      getPluginForFile: () => createPlugin('plugin.typescript'),
    });

    expect(graph.edges).toEqual([]);
  });

  it('materializes external package nodes for unresolved TypeScript imports', () => {
    const graph = buildWorkspaceGraphData({
      cacheFiles: {
        'src/index.ts': { size: 10 },
      },
      disabledPlugins: new Set(),
      fileConnections: new Map<string, IProjectedConnection[]>([
        ['src/index.ts', [
          { specifier: 'node:fs/promises', resolvedPath: null, kind: 'import', sourceId: 'es6-import' },
        ]],
      ]),
      showOrphans: true,
      churnCounts: {
        'src/index.ts': 2,
      },
      workspaceRoot: '/workspace',
      getPluginForFile: () => createPlugin('codegraphy.typescript'),
    });

    expect(graph.nodes).toEqual([
      {
        id: 'src/index.ts',
        label: 'index.ts',
        color: DEFAULT_NODE_COLOR,
        fileSize: 10,
        churn: 2,
      },
      {
        id: 'pkg:fs',
        label: 'fs',
        color: '#F59E0B',
        nodeType: 'package',
        shape2D: 'hexagon',
        shape3D: 'cube',
      },
    ]);
    expect(graph.edges).toEqual([
      {
        id: 'src/index.ts->pkg:fs#import',
        from: 'src/index.ts',
        to: 'pkg:fs',
        kind: 'import',
        sources: [
          {
            id: 'codegraphy.typescript:es6-import',
            pluginId: 'codegraphy.typescript',
            sourceId: 'es6-import',
            label: 'ES6 import',
          },
        ],
      },
    ]);
  });

  it('returns no edges when resolved targets are not discovered files', () => {
    const graph = buildWorkspaceGraphData({
      cacheFiles: {},
      disabledPlugins: new Set(),
      fileConnections: new Map<string, IProjectedConnection[]>([
        ['src/index.ts', [{ specifier: './missing', resolvedPath: '/workspace/src/missing.ts', kind: 'import', sourceId: 'es6-import' }]],
      ]),
      showOrphans: true,
      churnCounts: {},
      workspaceRoot: '/workspace',
      getPluginForFile: () => createPlugin('plugin.typescript'),
    });

    expect(graph.edges).toEqual([]);
  });

  it('creates a source list when a later duplicate edge adds another source', () => {
    const graph = buildWorkspaceGraphData({
      cacheFiles: {},
      disabledPlugins: new Set(),
      fileConnections: new Map<string, IProjectedConnection[]>([
        ['src/index.ts', [
          { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', sourceId: 'dynamic-import' },
          { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', sourceId: 'es6-import' },
        ]],
        ['src/utils.ts', []],
      ]),
      showOrphans: true,
      churnCounts: {},
      workspaceRoot: '/workspace',
      getPluginForFile: () => createPlugin('plugin.typescript'),
    });

    expect(graph.edges).toEqual([
      {
        id: 'src/index.ts->src/utils.ts#import',
        from: 'src/index.ts',
        to: 'src/utils.ts',
        kind: 'import',
        sources: [
          {
            id: 'plugin.typescript:dynamic-import',
            pluginId: 'plugin.typescript',
            sourceId: 'dynamic-import',
            label: 'Dynamic import',
          },
          {
            id: 'plugin.typescript:es6-import',
            pluginId: 'plugin.typescript',
            sourceId: 'es6-import',
            label: 'ES6 import',
          },
        ],
      },
    ]);
  });

  it('materializes discovered directories that have no file node descendants as folder nodes', () => {
    const graph = buildWorkspaceGraphData({
      cacheFiles: {
        'src/app.ts': { size: 10 },
      },
      directoryPaths: ['src', 'src/new-folder'],
      disabledPlugins: new Set(),
      fileConnections: new Map<string, IProjectedConnection[]>([
        ['src/app.ts', []],
      ]),
      showOrphans: true,
      churnCounts: {},
      workspaceRoot: '/workspace',
      getPluginForFile: () => createPlugin('plugin.typescript'),
    });

    expect(graph.nodes).toEqual([
      {
        id: 'src/app.ts',
        label: 'app.ts',
        color: DEFAULT_NODE_COLOR,
        fileSize: 10,
        churn: 0,
      },
      {
        id: 'src/new-folder',
        label: 'new-folder',
        color: DEFAULT_FOLDER_NODE_COLOR,
        nodeType: 'folder',
      },
    ]);
  });

  it('omits source provenance when no plugin matches the source file', () => {
    const graph = buildWorkspaceGraphData({
      cacheFiles: {},
      disabledPlugins: new Set(),
      fileConnections: new Map<string, IProjectedConnection[]>([
        ['src/index.ts', [{ specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', sourceId: 'es6-import' }]],
        ['src/utils.ts', []],
      ]),
      showOrphans: true,
      churnCounts: {},
      workspaceRoot: '/workspace',
      getPluginForFile: () => undefined,
    });

    expect(graph.edges).toEqual([
      {
        id: 'src/index.ts->src/utils.ts#import',
        from: 'src/index.ts',
        to: 'src/utils.ts',
        kind: 'import',
        sources: [],
      },
    ]);
  });
});
