import { describe, expect, it, vi } from 'vitest';
import type { FGLink, FGNode } from '../../../../../../src/webview/components/graph/model/build';
import {
  ownedLinkGeometry,
  pointOnOwnedLink,
  traceOwnedLink,
} from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/linkGeometry';

function node(id: string, x: number, y: number): FGNode {
  return { id, x, y } as FGNode;
}

describe('owned edge geometry', () => {
  it('keeps ordinary curved edges on the quadratic path', () => {
    const source = node('source', 0, 0);
    const target = node('target', 100, 0);
    const geometry = ownedLinkGeometry({
      curvature: 0.5,
      source,
      target,
    } as FGLink)!;
    const midpoint = pointOnOwnedLink(geometry, 0.5);
    const context = {
      beginPath: vi.fn(),
      bezierCurveTo: vi.fn(),
      moveTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    traceOwnedLink(context, geometry);

    expect(midpoint).toMatchObject({ x: 50, y: 25 });
    expect(context.quadraticCurveTo).toHaveBeenCalledOnce();
    expect(context.bezierCurveTo).not.toHaveBeenCalled();
  });

  it('creates a visible cubic curve for self-loop edges', () => {
    const endpoint = node('self', 10, 20);
    const geometry = ownedLinkGeometry({
      curvature: 0.5,
      source: endpoint,
      target: endpoint,
    } as FGLink)!;
    const midpoint = pointOnOwnedLink(geometry, 0.5);
    const context = {
      beginPath: vi.fn(),
      bezierCurveTo: vi.fn(),
      moveTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    traceOwnedLink(context, geometry);

    expect(midpoint.x).toBeGreaterThan(endpoint.x as number);
    expect(midpoint.y).toBeLessThan(endpoint.y as number);
    expect(context.bezierCurveTo).toHaveBeenCalledOnce();
    expect(context.quadraticCurveTo).not.toHaveBeenCalled();
  });
});
