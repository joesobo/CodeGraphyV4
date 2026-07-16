import { describe, expect, it } from 'vitest';
import { createSymbolRootNodeType } from '../../../../../../src/shared/graphControls/defaults/nodeTypes/symbols/root';

describe('shared/graphControls/defaults/nodeTypes/symbols/root', () => {
  it('creates the default-hidden symbol group', () => {
    expect(createSymbolRootNodeType()).toMatchObject({ id: 'symbol', defaultVisible: false });
  });
});
