import { describe, expect, it } from 'vitest';
import type { OwnedGraphNodeStyle } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/contracts';
import {
  OWNED_ARROW_HALF_WIDTH,
  OWNED_ARROW_LENGTH,
  ownedArrowEndpointInsets,
} from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/arrowGeometry';

function style(overrides: Partial<OwnedGraphNodeStyle> = {}): OwnedGraphNodeStyle {
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

describe('owned graph arrow endpoint geometry', () => {
  it('uses compact twelve-unit triangle proportions', () => {
    expect({
      halfWidth: OWNED_ARROW_HALF_WIDTH,
      length: OWNED_ARROW_LENGTH,
    }).toEqual({ halfWidth: 3.75, length: 12 });
  });

  it('places straight arrows on circular and rectangular node boundaries', () => {
    expect(ownedArrowEndpointInsets(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      0,
      style(),
      style({ height: 10, shape: 'rectangle', width: 40 }),
    )).toEqual({ source: 10, target: 20 });
  });

  it('uses the curved endpoint tangents when finding elliptical boundaries', () => {
    const insets = ownedArrowEndpointInsets(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      0.5,
      style({ height: 10, width: 20 }),
      style({ height: 10, width: 20 }),
    );

    expect(insets.source).toBeCloseTo(Math.sqrt(40), 5);
    expect(insets.target).toBeCloseTo(Math.sqrt(40), 5);
  });

  it('matches triangle, hexagon, star, and rounded-rectangle boundaries', () => {
    const targetInset = (targetStyle: Partial<OwnedGraphNodeStyle>, target = { x: 100, y: 0 }) => (
      ownedArrowEndpointInsets(
        { x: 0, y: 0 },
        target,
        0,
        style(),
        style(targetStyle),
      ).target
    );

    expect(targetInset({ shape: 'triangle' })).toBeCloseTo(10 / Math.sqrt(3), 5);
    expect(targetInset({ shape: 'hexagon' })).toBeCloseTo(10 / 0.866025, 5);
    expect(targetInset({ shape: 'star' })).toBeCloseTo(4.8, 5);
    expect(targetInset(
      { cornerRadius: 4, shape: 'rectangle' },
      { x: 100, y: 100 },
    )).toBeCloseTo(6 * Math.sqrt(2) + 4, 5);
  });

  it('places self-loop arrows on separate source and target boundaries', () => {
    expect(ownedArrowEndpointInsets(
      { x: 5, y: 5 },
      { x: 5, y: 5 },
      0.5,
      style(),
      style({ height: 10, shape: 'rectangle', width: 40 }),
    )).toEqual({ source: 10, target: 20 });
  });
});
