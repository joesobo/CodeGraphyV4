import { describe, expect, it } from 'vitest';
import { createBidirectionalLineGeometry } from '../../../../../src/webview/components/graph/rendering/bidirectional/lineGeometry';

function createNode(overrides: Record<string, number | undefined>) {
  return {
    size: 10,
    x: 0,
    y: 0,
    ...overrides,
  } as never;
}

describe('graph/rendering/bidirectional/lineGeometry', () => {
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

  it.each([
    ['source x', createNode({ x: undefined, y: 5 }), createNode({ x: 30, y: 15 })],
    ['source y', createNode({ x: 5, y: undefined }), createNode({ x: 30, y: 15 })],
    ['target x', createNode({ x: 5, y: 15 }), createNode({ x: undefined, y: 15 })],
    ['target y', createNode({ x: 5, y: 15 }), createNode({ x: 30, y: undefined })],
  ])('returns null when %s is missing', (_label, source, target) => {
    const geometry = createBidirectionalLineGeometry(source, target, 1);

    expect(geometry).toBeNull();
  });

  it('returns line geometry for a diagonal link using the normalized vector and perpendicular normal', () => {
    const geometry = createBidirectionalLineGeometry(
      { x: 10, y: 20, size: 5 } as never,
      { x: 34, y: 52, size: 9 } as never,
      2,
    );

    expect(geometry).not.toBeNull();
    expect(geometry).toMatchObject({
      arrowHalfWidth: 3.75,
      arrowLength: 12,
      arrowVertexLength: 2.4000000000000004,
      startX: 13,
      startY: 24,
      endX: 28.6,
      endY: 44.8,
      vectorX: 0.6,
      vectorY: 0.8,
      normalX: -0.8,
      normalY: 0.6,
    });
  });

  it('still returns geometry when the nodes are exactly one unit apart and have zero size', () => {
    const geometry = createBidirectionalLineGeometry(
      { x: 2, y: 3, size: 0 } as never,
      { x: 3, y: 3, size: 0 } as never,
      4,
    );

    expect(geometry).not.toBeNull();
    expect(geometry?.startX).toBe(2);
    expect(geometry?.startY).toBe(3);
    expect(geometry?.endX).toBe(3);
    expect(geometry?.endY).toBe(3);
    expect(geometry?.vectorX).toBe(1);
    expect(geometry?.vectorY).toBe(0);
    expect(geometry?.normalX).toBeCloseTo(0);
    expect(geometry?.normalY).toBe(1);
  });

  it('returns null when the trimmed start and end insets exactly consume the full segment', () => {
    const geometry = createBidirectionalLineGeometry(
      { x: 0, y: 0, size: 10 } as never,
      { x: 25, y: 0, size: 15 } as never,
      1,
    );

    expect(geometry).toBeNull();
  });
});
