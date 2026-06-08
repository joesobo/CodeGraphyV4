import { describe, expect, it } from 'vitest';
import {
  CORE_GRAPH_EDGE_TYPES,
  CORE_GRAPH_NODE_TYPES,
  STRUCTURAL_NESTS_EDGE_KIND,
} from '../../../../src/shared/graphControls/defaults/definitions';

describe('shared/graphControls/defaults/definitions', () => {
  it('declares the core graph node and edge definitions', () => {
    expect(CORE_GRAPH_NODE_TYPES.map((definition) => definition.id)).toEqual([
      'file',
      'folder',
      'package',
      'symbol',
      'symbol:function',
      'symbol:include',
      'symbol:prototype',
      'symbol:class',
      'symbol:interface',
      'symbol:type',
      'symbol:struct',
      'symbol:union',
      'symbol:enum',
      'symbol:typedef',
      'variable',
      'symbol:constant',
      'symbol:global',
      'plugin:codegraphy.gdscript:symbol:godot-class-name',
    ]);
    expect(CORE_GRAPH_EDGE_TYPES.some((definition) => definition.id === STRUCTURAL_NESTS_EDGE_KIND)).toBe(true);
    expect(CORE_GRAPH_EDGE_TYPES.some((definition) => definition.id === 'include')).toBe(true);
    expect(CORE_GRAPH_EDGE_TYPES.some((definition) => definition.id === 'import')).toBe(true);
  });
});
