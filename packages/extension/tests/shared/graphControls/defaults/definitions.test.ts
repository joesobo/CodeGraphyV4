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
      'symbol:namespace',
      'symbol:callable',
      'symbol:method',
      'symbol:prototype',
      'symbol:class',
      'symbol:interface',
      'symbol:type',
      'symbol:struct',
      'symbol:union',
      'symbol:enum',
      'symbol:typedef',
      'symbol:alias',
      'symbol:template',
      'plugin:codegraphy.gdscript:symbol:scene',
      'plugin:codegraphy.gdscript:symbol:resource',
      'plugin:codegraphy.gdscript:symbol:autoload',
      'plugin:codegraphy.gdscript:symbol:scene-node',
      'plugin:codegraphy.gdscript:symbol:signal',
      'variable',
      'variable:plain',
      'symbol:constant',
      'symbol:global',
      'symbol:field',
      'symbol:parameter',
      'symbol:local',
      'plugin:codegraphy.gdscript:symbol:godot-class-name',
      'plugin:codegraphy.gdscript:symbol:exported-property',
    ]);
    expect(CORE_GRAPH_EDGE_TYPES.some((definition) => definition.id === STRUCTURAL_NESTS_EDGE_KIND)).toBe(true);
    expect(CORE_GRAPH_EDGE_TYPES.some((definition) => definition.id === 'include')).toBe(true);
    expect(CORE_GRAPH_EDGE_TYPES.some((definition) => definition.id === 'import')).toBe(true);
    expect(CORE_GRAPH_EDGE_TYPES.some((definition) => definition.id === 'codegraphy.gdscript:signal-connection')).toBe(true);
  });
});
