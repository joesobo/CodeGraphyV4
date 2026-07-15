import { describe, expect, it } from 'vitest';
import { createSymbolDataNodeTypes } from '../../../../../../src/shared/graphControls/defaults/nodeTypes/symbols/data';

describe('shared/graphControls/defaults/nodeTypes/symbols/data', () => {
  it('creates the data declaration types', () => {
    expect(Object.values(createSymbolDataNodeTypes()).map(({ id }) => id)).toEqual([
      'symbol:record', 'symbol:type', 'symbol:struct',
    ]);
  });
});
