import { describe, expect, it } from 'vitest';
import { createSymbolRelationEdges } from '../../src/graph/symbolRelations';

describe('core/graph/symbolRelations', () => {
  it('keeps relation type and variant in symbol edge identities', () => {
    const edges = createSymbolRelationEdges(
      new Map([
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
          relations: [
            {
              edgeType: 'reference',
              pluginId: 'codegraphy.godot',
              sourceId: 'reference',
              from: { kind: 'symbol', symbolId: '/workspace/src/player.gd:method:_ready', filePath: '/workspace/src/player.gd' },
              target: { kind: 'symbol', symbolId: '/workspace/src/player.gd:method:setup_input', filePath: '/workspace/src/player.gd' },
              timing: 'read',
              variant: 'soft',
            },
            {
              edgeType: 'reference',
              pluginId: 'codegraphy.godot',
              sourceId: 'reference',
              from: { kind: 'symbol', symbolId: '/workspace/src/player.gd:method:_ready', filePath: '/workspace/src/player.gd' },
              target: { kind: 'symbol', symbolId: '/workspace/src/player.gd:method:setup_input', filePath: '/workspace/src/player.gd' },
              timing: 'write',
              variant: 'hard',
            },
          ],
        }],
      ]),
      '/workspace',
    );

    expect(edges).toHaveLength(2);
    expect(edges.map((edge) => edge.id)).toEqual([
      'src/player.gd#_ready:method->src/player.gd#setup_input:method#reference:read~soft',
      'src/player.gd#_ready:method->src/player.gd#setup_input:method#reference:write~hard',
    ]);
    expect(edges.map((edge) => edge.sources[0]?.variant)).toEqual(['soft', 'hard']);
  });
});
