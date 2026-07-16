import { describe, expect, it } from 'vitest';
import {
  measureGraphSceneFit,
  type GraphRendererNodeStyle,
} from '../src';

const style: GraphRendererNodeStyle = {
  borderColor: '#000', borderWidth: 0, cornerRadius: 0,
  fillColor: '#fff', fillOpacity: 1, height: 40, opacity: 1,
  shape: 'rectangle', width: 100,
};

describe('graph renderer scene fit', () => {
  it('measures static geometry and the largest node half-size', () => {
    const source = { id: 'source', x: 0, y: 0 };
    const target = { id: 'target', x: 100, y: 0 };

    expect(measureGraphSceneFit({
      getNodeStyle: node => node === target ? { ...style, height: 60, width: 120 } : style,
      links: [{ curvature: 0.5, source, target }],
      nodes: [source, target],
    })).toEqual({
      bounds: { maxX: 100, maxY: 0, minX: 0, minY: -25 },
      maxNodeHalfHeight: 30,
      maxNodeHalfWidth: 60,
    });
  });

  it('ignores nodes without finite positions', () => {
    expect(measureGraphSceneFit({
      getNodeStyle: () => style,
      links: [],
      nodes: [{ id: 'invalid', x: Number.NaN, y: 0 }, { id: 'valid', x: 3, y: 4 }],
    })).toEqual({
      bounds: { maxX: 3, maxY: 4, minX: 3, minY: 4 },
      maxNodeHalfHeight: 20,
      maxNodeHalfWidth: 50,
    });
  });

  it('returns no measurement for an empty scene', () => {
    expect(measureGraphSceneFit({
      getNodeStyle: () => style,
      links: [],
      nodes: [],
    })).toBeUndefined();
  });
});
