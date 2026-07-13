import { describe, expect, it } from 'vitest';
import type { OwnedGraphNodeStyle } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/contracts';
import { ownedArrowEndpointInsets } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/arrowGeometry';

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

  it('returns zero insets for a degenerate edge', () => {
    expect(ownedArrowEndpointInsets(
      { x: 5, y: 5 },
      { x: 5, y: 5 },
      0.5,
      style(),
      style(),
    )).toEqual({ source: 0, target: 0 });
  });
});
