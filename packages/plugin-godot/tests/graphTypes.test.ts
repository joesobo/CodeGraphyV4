import { describe, expect, it } from 'vitest';
import { createGodotEdgeTypes, createGodotNodeTypes } from '../src/graphTypes';

describe('Godot graph type contributions', () => {
  it('describes Godot analysis output without interface rendering fields', () => {
    const nodeTypes = createGodotNodeTypes();

    expect(nodeTypes.map(({ id }) => id)).toEqual([
      'plugin:codegraphy.gdscript:symbol:godot-class-name',
      'plugin:codegraphy.gdscript:symbol:scene',
      'plugin:codegraphy.gdscript:symbol:resource',
      'plugin:codegraphy.gdscript:symbol:autoload',
      'plugin:codegraphy.gdscript:symbol:scene-node',
      'plugin:codegraphy.gdscript:symbol:signal',
      'plugin:codegraphy.gdscript:symbol:exported-property',
    ]);
    expect(nodeTypes).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ defaultColor: expect.anything() }),
    ]));
    expect(createGodotEdgeTypes().map(({ id }) => id)).toEqual([
      'codegraphy.gdscript:signal-connection',
    ]);
  });
});
