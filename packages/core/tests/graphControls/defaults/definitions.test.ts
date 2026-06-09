import { describe, expect, it } from 'vitest';
import { CORE_GRAPH_NODE_TYPES } from '../../../src/graphControls/defaults/definitions';

describe('graphControls/defaults/definitions', () => {
  it('keeps symbol and variable node types disabled by default', () => {
    const visibilityByType = Object.fromEntries(
      CORE_GRAPH_NODE_TYPES.map((definition) => [definition.id, definition.defaultVisible]),
    );

    expect(visibilityByType).toMatchObject({
      symbol: false,
      'symbol:function': false,
      'symbol:class': false,
      'symbol:interface': false,
      'symbol:type': false,
      'symbol:struct': false,
      'symbol:enum': false,
      variable: false,
      'symbol:constant': false,
      'plugin:codegraphy.gdscript:symbol:godot-class-name': false,
    });

    expect(CORE_GRAPH_NODE_TYPES.find((definition) => definition.id === 'variable')?.parentId)
      .toBe('symbol');
  });
});
