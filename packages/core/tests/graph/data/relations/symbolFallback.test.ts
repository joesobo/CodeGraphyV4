import { describe, expect, it } from 'vitest';
import { buildWorkspaceGraphDataFromAnalysis } from '../../../../src/graph/data';
import { createPlugin } from '../fixture';

describe('core/graph/data symbol relation fallback', () => {
    it('uses symbol edges instead of duplicate file-level edges for symbol endpoint relations', () => {
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
        nodeVisibility: { symbol: true, 'symbol:function': true },
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

});
