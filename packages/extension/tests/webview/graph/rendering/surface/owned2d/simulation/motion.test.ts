import { afterEach, describe, expect, it, vi } from 'vitest';
import { graphMotionDuration } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/simulation/motion';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('owned graph motion preference', () => {
  it('preserves requested durations by default', () => {
    expect(graphMotionDuration(150)).toBe(150);
    expect(graphMotionDuration(undefined)).toBe(0);
  });

  it('removes animation duration when reduced motion is preferred', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    expect(graphMotionDuration(300)).toBe(0);
  });
});
