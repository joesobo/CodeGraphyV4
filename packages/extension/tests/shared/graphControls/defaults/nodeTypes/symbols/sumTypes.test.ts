import { describe, expect, it } from 'vitest';
import { createSymbolSumTypeNodeTypes } from '../../../../../../src/shared/graphControls/defaults/nodeTypes/symbols/sumTypes';

describe('shared/graphControls/defaults/nodeTypes/symbols/sumTypes', () => {
  it('creates the union and enum declaration types', () => {
    expect(Object.values(createSymbolSumTypeNodeTypes()).map(({ id }) => id)).toEqual([
      'symbol:union', 'symbol:enum',
    ]);
  });
});
