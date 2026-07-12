import { describe, expect, it } from 'vitest';
import { DEFAULT_GRAPH_LAYOUT_CONFIG } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics';

describe('default graph physics configuration', () => {
  it('ships the tuned CodeGraphy force values', () => {
    expect(DEFAULT_GRAPH_LAYOUT_CONFIG).toMatchObject({
      gravitationalConstant: -250,
      springLength: 80,
      springConstant: 0.15,
      damping: 0.7,
      centralGravity: 0.1,
    });
  });
});
