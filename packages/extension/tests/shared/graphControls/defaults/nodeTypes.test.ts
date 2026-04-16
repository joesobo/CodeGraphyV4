import { describe, expect, it } from 'vitest';
import { CORE_GRAPH_NODE_TYPES } from '../../../../src/shared/graphControls/defaults/nodeTypes';

describe('shared/graphControls/defaults/nodeTypes', () => {
  it('declares the core graph node defaults', () => {
    expect(CORE_GRAPH_NODE_TYPES).toEqual([
      expect.objectContaining({ id: 'file', defaultVisible: true }),
      expect.objectContaining({ id: 'folder', defaultVisible: false }),
      expect.objectContaining({ id: 'package', defaultVisible: false }),
    ]);
  });
});
