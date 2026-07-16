import { describe, expect, it } from 'vitest';
import {
  OWNED_GRAPH_MINIMAP_CONTROL_GAP,
  OWNED_GRAPH_MINIMAP_LEFT_INSET,
  OWNED_GRAPH_MINIMAP_RESERVED_LEFT,
  OWNED_GRAPH_MINIMAP_SIZE,
} from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/minimap/layout';

describe('Relationship Graph minimap layout', () => {
  it('reserves a control lane beyond the minimap right edge', () => {
    expect(OWNED_GRAPH_MINIMAP_RESERVED_LEFT).toBe(
      OWNED_GRAPH_MINIMAP_LEFT_INSET
      + OWNED_GRAPH_MINIMAP_SIZE
      + OWNED_GRAPH_MINIMAP_CONTROL_GAP,
    );
    expect(OWNED_GRAPH_MINIMAP_RESERVED_LEFT).toBe(184);
  });
});
