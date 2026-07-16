import { describe, expect, it } from 'vitest';
import { createSymbolEventNodeTypes } from '../../../../../../src/shared/graphControls/defaults/nodeTypes/symbols/events';

describe('shared/graphControls/defaults/nodeTypes/symbols/events', () => {
  it('creates the event declaration types', () => {
    expect(Object.values(createSymbolEventNodeTypes()).map(({ id }) => id)).toEqual([
      'symbol:delegate', 'symbol:event',
    ]);
  });
});
