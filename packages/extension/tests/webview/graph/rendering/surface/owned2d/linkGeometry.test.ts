import { describe, expect, it } from 'vitest';
import type { FGLink, FGNode } from '../../../../../../src/webview/components/graph/model/build';
import {
  ownedLinkGeometry,
  pointOnOwnedLink,
} from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/linkGeometry';

function node(id: string, x: number, y: number): FGNode {
  return { id, x, y } as FGNode;
}

describe('owned edge geometry', () => {
  it('keeps ordinary curved edges on a quadratic path', () => {
    const geometry = ownedLinkGeometry({
      curvature: 0.5,
      source: node('source', 0, 0),
      target: node('target', 100, 0),
    } as FGLink)!;

    expect(pointOnOwnedLink(geometry, 0.5)).toMatchObject({ x: 50, y: -25 });
    expect(geometry.secondControlX).toBeUndefined();
    expect(geometry.secondControlY).toBeUndefined();
  });

  it('creates a visible cubic curve for self-loop edges', () => {
    const endpoint = node('self', 10, 20);
    const geometry = ownedLinkGeometry({
      curvature: 0.5,
      source: endpoint,
      target: endpoint,
    } as FGLink)!;
    const midpoint = pointOnOwnedLink(geometry, 0.5);

    expect(midpoint.x).toBeGreaterThan(endpoint.x as number);
    expect(midpoint.y).toBeLessThan(endpoint.y as number);
    expect(geometry.secondControlX).toBeDefined();
    expect(geometry.secondControlY).toBeDefined();
  });
});
