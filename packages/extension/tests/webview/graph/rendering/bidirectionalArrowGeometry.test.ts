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

  it('builds arrow-head points for a diagonal arrow with non-zero y and x offsets', () => {
    const geometry = createBidirectionalArrowGeometry(
      20,
      40,
      0.6,
      0.8,
      -0.8,
      0.6,
      10,
      4,
      2.5,
    );

    expect(geometry).toEqual({
      leftX: 10.8,
      leftY: 34.4,
      rightX: 17.2,
      rightY: 29.6,
      tipX: 20,
      tipY: 40,
      vertexX: 18.5,
      vertexY: 38,
    });
  });
});
