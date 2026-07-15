import { describe, expect, it } from 'vitest';
import { createSymbolAliasNodeTypes } from '../../../../../../src/shared/graphControls/defaults/nodeTypes/symbols/aliases';

describe('shared/graphControls/defaults/nodeTypes/symbols/aliases', () => {
  it('creates the alias declaration types', () => {
    expect(Object.values(createSymbolAliasNodeTypes()).map(({ id }) => id)).toEqual([
      'symbol:typedef', 'symbol:alias',
    ]);
  });
});
