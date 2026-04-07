import { describe, expect, it } from 'vitest';
import { clampDepthLimit, MAX_DEPTH_LIMIT, MIN_DEPTH_LIMIT } from '../../../../src/core/views/depth/limits';

describe('core/views/depth/limits', () => {
  it('defaults to the minimum depth when no limit is provided', () => {
    expect(clampDepthLimit(undefined)).toBe(MIN_DEPTH_LIMIT);
  });

  it('clamps provided limits into the supported range', () => {
    expect(clampDepthLimit(0)).toBe(MIN_DEPTH_LIMIT);
    expect(clampDepthLimit(MAX_DEPTH_LIMIT + 5)).toBe(MAX_DEPTH_LIMIT);
    expect(clampDepthLimit(3)).toBe(3);
  });
});
