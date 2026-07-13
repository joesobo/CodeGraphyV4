import { describe, expect, it } from 'vitest';
import {
  graphDetailOpacity,
  shouldRenderGraphDetails,
} from '../../../../src/webview/components/graph/rendering/detailVisibility';

describe('graph detail zoom visibility', () => {
  it('stops labels and arrows entirely at the distant zoom cutoff', () => {
    expect(graphDetailOpacity(0.35)).toBe(0);
    expect(shouldRenderGraphDetails(0.35)).toBe(false);
  });

  it('fades details in above the cutoff and reaches full opacity nearby', () => {
    expect(graphDetailOpacity(0.95)).toBeCloseTo(0.5);
    expect(graphDetailOpacity(1.55)).toBe(1);
    expect(shouldRenderGraphDetails(0.95)).toBe(true);
  });
});
