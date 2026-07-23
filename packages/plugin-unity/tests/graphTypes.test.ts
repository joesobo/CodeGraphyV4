import { describe, expect, it } from 'vitest';
import { createUnityNodeTypes } from '../src/graphTypes';

describe('Unity graph type contributions', () => {
  it('describes Unity analysis output without interface rendering fields', () => {
    const nodeTypes = createUnityNodeTypes();

    expect(nodeTypes.map(({ id }) => id)).toEqual([
      'plugin:codegraphy.unity:symbol',
      'plugin:codegraphy.unity:symbol:game-object',
      'plugin:codegraphy.unity:symbol:component',
    ]);
    expect(nodeTypes).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ defaultColor: expect.anything() }),
    ]));
  });
});
