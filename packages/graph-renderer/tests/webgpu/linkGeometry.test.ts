import { describe, expect, it } from 'vitest';
import type { GraphRendererNode } from '@graph-renderer/contracts';
import {
  resolveGraphLinkGeometry,
} from '@graph-renderer/webgpu/link/geometry/model';
import { pointOnGraphLink } from '@graph-renderer/webgpu/link/geometry/point';

function node(id: string, x: number, y: number): GraphRendererNode {
  return { id, x, y };
}

describe('graph edge geometry', () => {
  it('rejects links without resolved endpoints', () => {
    expect(resolveGraphLinkGeometry({ source: undefined, target: undefined })).toBeUndefined();
  });

  it('rejects links with string endpoints', () => {
    expect(resolveGraphLinkGeometry({ source: 'source', target: 'target' })).toBeUndefined();
  });

  it('rejects links with non-finite positions', () => {
    expect(resolveGraphLinkGeometry({
      source: node('source', Number.NaN, 0),
      target: node('target', 100, 0),
    })).toBeUndefined();
  });

  it('keeps ordinary curved edges on a quadratic path', () => {
    const geometry = resolveGraphLinkGeometry({
      curvature: 0.5,
      source: node('source', 0, 0),
      target: node('target', 100, 0),
    })!;

    expect(pointOnGraphLink(geometry, 0.5)).toMatchObject({ x: 50, y: -25 });
    expect(geometry.secondControlX).toBeUndefined();
    expect(geometry.secondControlY).toBeUndefined();
  });

  it('creates a visible cubic curve for self-loop edges', () => {
    const endpoint = node('self', 10, 20);
    const geometry = resolveGraphLinkGeometry({
      curvature: 0.5,
      source: endpoint,
      target: endpoint,
    })!;
    const midpoint = pointOnGraphLink(geometry, 0.5);

    expect(midpoint.x).toBeGreaterThan(endpoint.x as number);
    expect(midpoint.y).toBeLessThan(endpoint.y as number);
    expect(geometry.secondControlX).toBeDefined();
    expect(geometry.secondControlY).toBeDefined();
  });
});
