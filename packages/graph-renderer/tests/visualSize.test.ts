import { describe, expect, it } from 'vitest';
import {
  graphNodeScreenRadius,
  graphNodeWorldScale,
} from '@graph-renderer/visualSize';

describe('graph visual node sizing', () => {
  it.each([
    { zoom: 0.25, worldScale: 2, screenRadius: 4 },
    { zoom: 1, worldScale: 1, screenRadius: 8 },
    { zoom: 4, worldScale: 0.5, screenRadius: 16 },
  ])('uses Obsidian square-root zoom compensation at $zoom×', ({ zoom, worldScale, screenRadius }) => {
    expect(graphNodeWorldScale(zoom)).toBe(worldScale);
    expect(graphNodeScreenRadius(8, zoom)).toBe(screenRadius);
  });
});
