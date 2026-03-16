import { describe, expect, it } from 'vitest';
import { createBidirectionalLineGeometry } from '../../../../src/webview/components/graph/rendering/bidirectionalLineGeometry';

describe('graph/rendering/bidirectionalLineGeometry', () => {
  it('returns bidirectional line endpoints trimmed to each node radius', () => {
    const geometry = createBidirectionalLineGeometry(
      { x: 0, y: 10, size: 10 } as never,
      { x: 80, y: 10, size: 10 } as never,
      1,
    );

    expect(geometry).not.toBeNull();
    expect(geometry?.arrowHalfWidth).toBe(3.75);
    expect(geometry?.arrowLength).toBe(12);
    expect(geometry?.arrowVertexLength).toBe(2.4000000000000004);
    expect(geometry?.startX).toBe(10);
    expect(geometry?.startY).toBe(10);
    expect(geometry?.endX).toBe(70);
    expect(geometry?.endY).toBe(10);
    expect(geometry?.vectorX).toBe(1);
    expect(geometry?.vectorY).toBeCloseTo(0);
    expect(geometry?.normalX).toBeCloseTo(0);
    expect(geometry?.normalY).toBe(1);
  });

  it('returns null when the two nodes are too close together to draw a trimmed line', () => {
    const geometry = createBidirectionalLineGeometry(
      { x: 0, y: 10, size: 10 } as never,
      { x: 15, y: 10, size: 10 } as never,
      1,
    );

    expect(geometry).toBeNull();
  });
});
