import { describe, expect, it } from 'vitest';
import {
  measureGraphSceneBounds,
  type GraphRendererNodeStyle,
} from '../src';

const style: GraphRendererNodeStyle = {
  borderColor: '#000', borderWidth: 0, cornerRadius: 0,
  fillColor: '#fff', fillOpacity: 1, height: 40, opacity: 1,
  shape: 'rectangle', width: 100,
};

describe('graph renderer scene bounds', () => {
  it('includes the rendered sqrt-zoom extent of a single large node', () => {
    expect(measureGraphSceneBounds({
      getNodeStyle: () => style,
      links: [],
      nodes: [{ id: 'large', x: 10, y: 20 }],
      zoom: 4,
    })).toEqual({ maxX: 35, maxY: 30, minX: -15, minY: 10 });
  });

  it('includes the visible quadratic extent of a curved edge', () => {
    const source = { id: 'source', x: 0, y: 0 };
    const target = { id: 'target', x: 100, y: 0 };
    const bounds = measureGraphSceneBounds({
      getNodeStyle: () => style,
      links: [{ curvature: 0.5, source, target }],
      nodes: [],
      zoom: 1,
    });

    expect(bounds).toEqual({ maxX: 100, maxY: 0, minX: 0, minY: -25 });
  });

  it('includes the visible cubic extent of a self-loop', () => {
    const endpoint = { id: 'self', x: 10, y: 20 };
    const bounds = measureGraphSceneBounds({
      getNodeStyle: () => style,
      links: [{ curvature: 1, source: endpoint, target: endpoint }],
      nodes: [],
      zoom: 1,
    })!;

    expect(bounds.maxX).toBeGreaterThan(40);
    expect(bounds.minY).toBeLessThan(-10);
  });
});
