import { describe, expect, it } from 'vitest';
import { createUnityNodeTypes } from '../../src/graph/types';

describe('Unity graph type contributions', () => {
  it('declares the Unity semantic Node Type IDs', () => {
    const nodeTypes = createUnityNodeTypes();

    expect(nodeTypes.map(({ id }) => id)).toEqual([
      'plugin:codegraphy.unity:symbol',
      'plugin:codegraphy.unity:symbol:game-object',
      'plugin:codegraphy.unity:symbol:component',
    ]);
  });

  it('does not declare interface rendering fields', () => {
    expect(createUnityNodeTypes()).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ defaultColor: expect.anything() }),
    ]));
  });
});
