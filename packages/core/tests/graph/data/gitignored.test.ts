import { describe, expect, it } from 'vitest';
import { buildWorkspaceGraphDataFromAnalysis } from '../../../src/graph/data';
import { createPlugin, SYMBOL_NODE_VISIBILITY } from './fixture';


describe('core/graph/data gitignored metadata', () => {
  it('marks symbol nodes whose containing file is gitignored', () => {
    const graph = buildWorkspaceGraphDataFromAnalysis({
      cacheFiles: {
        'example-python/app.py': { size: 20 },
      },
      disabledPlugins: new Set(),
      fileAnalysis: new Map([
        ['/workspace/example-python/app.py', {
          filePath: '/workspace/example-python/app.py',
          symbols: [{
            id: 'main-symbol',
            filePath: '/workspace/example-python/app.py',
            kind: 'function',
            name: 'main',
            metadata: {
              language: 'python',
              source: 'codegraphy.vue',
            },
          }],
          relations: [],
        }],
      ]),
      gitIgnoredPaths: ['example-python/app.py'],
      showOrphans: true,
      nodeVisibility: SYMBOL_NODE_VISIBILITY,
      workspaceRoot: '/workspace',
      getPluginForFile: () => createPlugin('codegraphy.vue'),
    });

    expect(graph.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'example-python/app.py#main:function',
        metadata: {
          gitIgnored: true,
          gitIgnoredReason: 'Git ignored',
        },
        symbol: expect.objectContaining({
          filePath: 'example-python/app.py',
        }),
      }),
    ]));
  });
});
