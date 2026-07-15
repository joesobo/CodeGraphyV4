import { describe, expect, it } from 'vitest';
import { createSymbolScopeNodeTypes } from '../../../../../../src/shared/graphControls/defaults/nodeTypes/symbols/scopes';

describe('shared/graphControls/defaults/nodeTypes/symbols/scopes', () => {
  it('creates the named scope types', () => {
    expect(Object.values(createSymbolScopeNodeTypes()).map(({ id }) => id)).toEqual([
      'symbol:namespace', 'symbol:class', 'symbol:interface',
    ]);
  });
});
