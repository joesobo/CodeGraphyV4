import { describe, expect, it } from 'vitest';
import { createGodotEdgeTypes, createGodotNodeTypes } from '../../src/graph/types';

describe('Godot graph type contributions', () => {
  it('declares the Godot semantic Node Type IDs', () => {
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
  });

  it('does not declare interface rendering fields', () => {
    expect(createGodotNodeTypes()).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ defaultColor: expect.anything() }),
    ]));
  });

  it('declares the Godot semantic Edge Type IDs', () => {
    expect(createGodotEdgeTypes().map(({ id }) => id)).toEqual([
      'codegraphy.gdscript:signal-connection',
    ]);
  });
});
