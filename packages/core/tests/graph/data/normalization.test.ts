import { describe, expect, it } from 'vitest';
import { buildWorkspaceGraphDataFromAnalysis } from '../../../src/graph/data';
import { createPlugin, VARIABLE_NODE_VISIBILITY } from './fixture';


describe('core/graph/data symbol normalization', () => {
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
      nodeVisibility: VARIABLE_NODE_VISIBILITY,
      workspaceRoot: '/workspace',
      getPluginForFile: () => createPlugin('codegraphy.godot'),
    });

    expect(graph.nodes).toEqual(expect.arrayContaining([
      {
        id: 'src/player.gd#score:field:var%20score%3A%20int',
        label: 'score',
        fileSize: 20,
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
});
