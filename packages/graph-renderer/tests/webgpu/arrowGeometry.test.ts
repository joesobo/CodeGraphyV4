import { describe, expect, it } from 'vitest';
import type { GraphRendererNodeStyle } from '@graph-renderer/contracts';
import {
  OWNED_ARROW_HALF_WIDTH,
  OWNED_ARROW_LENGTH,
  writeOwnedArrowCurveParameters,
} from '@graph-renderer/webgpu/arrowGeometry';
import {
  ownedLinkGeometry,
  pointOnOwnedLink,
} from '@graph-renderer/webgpu/linkGeometry';

function style(overrides: Partial<GraphRendererNodeStyle> = {}): GraphRendererNodeStyle {
  return {
    borderColor: '#000000',
    borderWidth: 0,
    cornerRadius: 0,
    fillColor: '#ffffff',
    fillOpacity: 1,
    height: 20,
    opacity: 1,
    shape: 'circle',
    width: 20,
    ...overrides,
  };
}

function ownedArrowCurveParameters(
  source: { x: number; y: number },
  target: { x: number; y: number },
  curvature: number,
  sourceStyle: GraphRendererNodeStyle,
  targetStyle: GraphRendererNodeStyle,
  visualScale = 1,
): { source: number; target: number } {
  const output = new Float32Array(2);
  writeOwnedArrowCurveParameters(
    output,
    0,
    source.x,
    source.y,
    target.x,
    target.y,
    curvature,
    sourceStyle,
    targetStyle,
    visualScale,
  );
  return { source: output[0], target: output[1] };
}

function geometry(
  source: { x: number; y: number },
  target: { x: number; y: number },
  curvature: number,
) {
  return ownedLinkGeometry({
    curvature,
    source: { id: 'source', ...source },
    target: { id: 'target', ...target },
  })!;
}

describe('owned graph arrow endpoint geometry', () => {
  it('uses compact twelve-unit triangle proportions', () => {
    expect({
      halfWidth: OWNED_ARROW_HALF_WIDTH,
      length: OWNED_ARROW_LENGTH,
    }).toEqual({ halfWidth: 3.75, length: 12 });
  });

  it('places straight arrow tips on circular and rectangular node boundaries', () => {
    const parameters = ownedArrowCurveParameters(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      0,
      style(),
      style({ height: 10, shape: 'rectangle', width: 40 }),
    );

    expect(parameters.source).toBeCloseTo(0.1, 6);
    expect(parameters.target).toBeCloseTo(0.8, 6);
  });

  it('clips arrows to zoom-compensated node boundaries', () => {
    const parameters = ownedArrowCurveParameters(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      0,
      style(),
      style(),
      0.5,
    );

    expect(parameters.source).toBeCloseTo(0.05, 6);
    expect(parameters.target).toBeCloseTo(0.95, 6);
  });

  it('keeps curved arrow tips on both the curve and elliptical node boundaries', () => {
    const source = { x: 0, y: 0 };
    const target = { x: 100, y: 0 };
    const parameters = ownedArrowCurveParameters(
      source,
      target,
      0.5,
      style({ height: 10, width: 20 }),
      style({ height: 10, width: 20 }),
    );
    const linkGeometry = geometry(source, target, 0.5);

    for (const [center, position] of [
      [source, parameters.source],
      [target, parameters.target],
    ] as const) {
      const tip = pointOnOwnedLink(linkGeometry, position);
      expect(((tip.x - center.x) / 10) ** 2 + ((tip.y - center.y) / 5) ** 2)
        .toBeCloseTo(1, 3);
    }
  });

  it('matches triangle, hexagon, star, and rounded-rectangle boundaries', () => {
    const targetDistance = (
      targetStyle: Partial<GraphRendererNodeStyle>,
      target = { x: 100, y: 0 },
    ) => {
      const parameters = ownedArrowCurveParameters(
        { x: 0, y: 0 },
        target,
        0,
        style(),
        style(targetStyle),
      );
      const tip = pointOnOwnedLink(geometry({ x: 0, y: 0 }, target, 0), parameters.target);
      return Math.hypot(target.x - tip.x, target.y - tip.y);
    };

    expect(targetDistance({ shape: 'triangle' })).toBeCloseTo(10 / Math.sqrt(3), 3);
    expect(targetDistance({ shape: 'hexagon' })).toBeCloseTo(10 / 0.866025, 3);
    expect(targetDistance({ shape: 'star' })).toBeCloseTo(4.8, 3);
    expect(targetDistance(
      { cornerRadius: 4, shape: 'rectangle' },
      { x: 100, y: 100 },
    )).toBeCloseTo(6 * Math.sqrt(2) + 4, 3);
  });

  it('keeps self-loop tips on large asymmetric ellipse boundaries', () => {
    const endpoint = { x: 5, y: 5 };
    const ellipseStyle = style({ height: 47, width: 71 });
    const parameters = ownedArrowCurveParameters(
      endpoint,
      endpoint,
      0.8,
      ellipseStyle,
      ellipseStyle,
    );
    const linkGeometry = geometry(endpoint, endpoint, 0.8);

    for (const position of [parameters.source, parameters.target]) {
      const tip = pointOnOwnedLink(linkGeometry, position);
      expect(((tip.x - endpoint.x) / 35.5) ** 2 + ((tip.y - endpoint.y) / 23.5) ** 2)
        .toBeCloseTo(1, 3);
    }
  });

  it('places self-loop tips on the top and right sides of an asymmetric node', () => {
    const endpoint = { x: 5, y: 5 };
    const asymmetricStyle = style({ height: 20, shape: 'rectangle', width: 30 });
    const parameters = ownedArrowCurveParameters(
      endpoint,
      endpoint,
      0.5,
      asymmetricStyle,
      asymmetricStyle,
    );
    const linkGeometry = geometry(endpoint, endpoint, 0.5);
    const sourceTip = pointOnOwnedLink(linkGeometry, parameters.source);
    const targetTip = pointOnOwnedLink(linkGeometry, parameters.target);

    expect(sourceTip.y).toBeCloseTo(-5, 1);
    expect(targetTip.x).toBeCloseTo(20, 1);
  });
});
