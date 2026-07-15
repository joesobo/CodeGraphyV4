import { describe, expect, it } from 'vitest';
import {
  ownedGraphNodeScreenRadius,
  ownedGraphNodeWorldScale,
} from '@graph-renderer/visualSize';

describe('owned2d visual node sizing', () => {
  it.each([
    { zoom: 0.25, worldScale: 2, screenRadius: 4 },
    { zoom: 1, worldScale: 1, screenRadius: 8 },
    { zoom: 4, worldScale: 0.5, screenRadius: 16 },
  ])('uses Obsidian square-root zoom compensation at $zoom×', ({ zoom, worldScale, screenRadius }) => {
    expect(ownedGraphNodeWorldScale(zoom)).toBe(worldScale);
    expect(ownedGraphNodeScreenRadius(8, zoom)).toBe(screenRadius);
  });
});
