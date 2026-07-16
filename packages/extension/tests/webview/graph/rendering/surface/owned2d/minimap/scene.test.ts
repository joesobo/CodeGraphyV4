import { describe, expect, it } from 'vitest';
import { fitMinimapSceneProjection } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/minimap/scene';

const style = {
  borderColor: '#000', borderWidth: 0, cornerRadius: 0,
  fillColor: '#fff', fillOpacity: 1, height: 40, opacity: 1,
  shape: 'rectangle' as const, width: 100,
};

describe('Relationship Graph minimap scene fitting', () => {
  it('returns no projection for an empty scene', () => {
    expect(fitMinimapSceneProjection({
      getNodeStyle: () => style,
      links: [],
      nodes: [],
    }, 160, 12)).toBeUndefined();
  });

  it('keeps a single large sqrt-zoom-scaled node inside the padded square', () => {
    const projection = fitMinimapSceneProjection({
      getNodeStyle: () => style,
      links: [],
      nodes: [{ id: 'large', x: 10, y: 20 }],
    }, 160, 12)!;

    expect(projection.centerX).toBe(10);
    expect(projection.centerY).toBe(20);
    expect(projection.zoom).toBeCloseTo(1.8496, 3);
  });

  it('fits curved and self-loop edge geometry rather than endpoints alone', () => {
    const source = { id: 'source', x: 0, y: 0 };
    const target = { id: 'target', x: 100, y: 0 };
    const curved = fitMinimapSceneProjection({
      getNodeStyle: () => style,
      links: [{ curvature: 0.5, source, target }],
      nodes: [],
    }, 160, 12)!;
    const loop = fitMinimapSceneProjection({
      getNodeStyle: () => style,
      links: [{ curvature: 1, source, target: source }],
      nodes: [],
    }, 160, 12)!;

    expect(curved.centerY).toBe(-12.5);
    expect(curved.zoom).toBeCloseTo(1.36);
    expect(loop.centerX).toBeGreaterThan(0);
    expect(loop.centerY).toBeLessThan(0);
  });

  it('solves the sqrt-scaled node margin along the limiting width', () => {
    const projection = fitMinimapSceneProjection({
      getNodeStyle: () => style,
      links: [],
      nodes: [{ id: 'left', x: 0, y: 0 }, { id: 'right', x: 100, y: 0 }],
    }, 160, 12)!;

    expect(projection.centerX).toBe(50);
    expect(projection.zoom).toBeCloseTo(0.59113, 4);
  });

  it('solves the sqrt-scaled node margin along the limiting height', () => {
    const projection = fitMinimapSceneProjection({
      getNodeStyle: () => style,
      links: [],
      nodes: [{ id: 'top', x: 0, y: -100 }, { id: 'bottom', x: 0, y: 100 }],
    }, 160, 12)!;

    expect(projection.centerY).toBe(0);
    expect(projection.zoom).toBeCloseTo(0.53387, 4);
  });
});
