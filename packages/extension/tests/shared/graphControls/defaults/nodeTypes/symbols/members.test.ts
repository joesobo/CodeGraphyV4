import { describe, expect, it } from 'vitest';
import { createSymbolMemberNodeTypes } from '../../../../../../src/shared/graphControls/defaults/nodeTypes/symbols/members';

describe('shared/graphControls/defaults/nodeTypes/symbols/members', () => {
  it('creates the callable and property member types', () => {
    expect(Object.values(createSymbolMemberNodeTypes()).map(({ id }) => id)).toEqual([
      'symbol:method', 'symbol:constructor', 'symbol:property',
    ]);
  });
});
