import { describe, expect, it } from 'vitest';
import { createSymbolCallableNodeTypes } from '../../../../../../src/shared/graphControls/defaults/nodeTypes/symbols/callables';

describe('shared/graphControls/defaults/nodeTypes/symbols/callables', () => {
  it('creates the callable symbol types', () => {
    expect(Object.values(createSymbolCallableNodeTypes()).map(({ id }) => id)).toEqual([
      'symbol:function', 'symbol:callable', 'symbol:prototype',
    ]);
  });
});
