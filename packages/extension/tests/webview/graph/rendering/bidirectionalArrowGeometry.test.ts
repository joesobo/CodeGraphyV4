import { describe, expect, it } from 'vitest';
import { createBidirectionalArrowGeometry } from '../../../../src/webview/components/graph/rendering/bidirectionalArrowGeometry';

describe('graph/rendering/bidirectionalArrowGeometry', () => {
  it('builds arrow-head points from the supplied tip and vectors', () => {
    const geometry = createBidirectionalArrowGeometry(
      70,
      10,
      1,
      0,
      0,
      1,
      12,
      3.75,
      2.4,
    );

    expect(geometry).toEqual({
      leftX: 58,
      leftY: 13.75,
      rightX: 58,
      rightY: 6.25,
      tipX: 70,
      tipY: 10,
      vertexX: 67.6,
      vertexY: 10,
    });
  });
});
