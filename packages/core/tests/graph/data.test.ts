import type { IPlugin } from '@codegraphy-dev/plugin-api';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_NODE_COLOR } from '../../src/fileColors';
import {
  buildWorkspaceGraphDataFromAnalysis
} from '../../src/graph/data';

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
    ],
    analyzeFile: vi.fn(async (filePath: string) => ({ filePath, relations: [] })),
  } as IPlugin;
}

describe('core/graph/data', () => {

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
        churnCounts: {
          'src/player.gd': 4,
        },
        nodeVisibility: { symbol: true },
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
        churnCounts: {},
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
        churnCounts: {},
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
        churnCounts: {
          'generated/virtual.ts': 7,
        },
        nodeVisibility: { symbol: true },
        workspaceRoot: '/workspace',
        getPluginForFile: () => createPlugin('codegraphy.typescript'),
      });

      expect(graph.nodes).toEqual([
        {
          id: 'generated/virtual.ts',
          label: 'virtual.ts',
          color: DEFAULT_NODE_COLOR,
          fileSize: undefined,
          churn: 7,
        },
        {
          id: 'generated/virtual.ts#virtual:function',
          label: 'virtual',
          color: '#8B5CF6',
          fileSize: undefined,
          churn: 7,
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
        nodeVisibility: { symbol: true },
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
              pluginId: 'codegraphy.treesitter',
              sourceId: 'inherit',
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
        nodeVisibility: { symbol: true },
        workspaceRoot: '/workspace',
        getPluginForFile: () => createPlugin('codegraphy.treesitter'),
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
        nodeVisibility: { symbol: true },
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
        nodeVisibility: { symbol: true },
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
              kind: '  Field  ',
              name: 'score',
              signature: 'var score: int',
            }],
            relations: [],
          }],
        ]),
        showOrphans: true,
        churnCounts: {},
        nodeVisibility: { symbol: true },
        workspaceRoot: '/workspace',
        getPluginForFile: () => createPlugin('codegraphy.godot'),
      });

      expect(graph.nodes).toEqual(expect.arrayContaining([
        {
          id: 'src/player.gd#score:field:var%20score%3A%20int',
          label: 'score',
          color: '#14B8A6',
          fileSize: 20,
          churn: 0,
          nodeType: 'variable',
          symbol: {
            id: 'src/player.gd#score:field:var%20score%3A%20int',
            name: 'score',
            kind: 'field',
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
        nodeVisibility: { symbol: true },
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
