import { describe, expect, it } from 'vitest';
import { createSymbolCompositionNodeTypes } from '../../../../../../src/shared/graphControls/defaults/nodeTypes/symbols/composition';

describe('shared/graphControls/defaults/nodeTypes/symbols/composition', () => {
  it('creates the composable declaration types', () => {
    expect(Object.values(createSymbolCompositionNodeTypes()).map(({ id }) => id)).toEqual([
      'symbol:mixin', 'symbol:extension', 'symbol:template',
    ]);
  });
});
