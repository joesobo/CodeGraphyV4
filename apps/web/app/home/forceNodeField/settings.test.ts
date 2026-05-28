import { describe, expect, it } from 'vitest';
import { defaultForceNodeSettings, normalizeForceSettings } from './settings';

describe('force node settings', () => {
  it('keeps the default sliders close to the original hero graph physics', () => {
    const normalized = normalizeForceSettings(defaultForceNodeSettings);

    expect(normalized.centerPullMultiplier).toBeCloseTo(1.045, 3);
    expect(normalized.centerStrength).toBeCloseTo(0.025, 3);
    expect(normalized.collisionIterations).toBe(2);
    expect(normalized.collisionPadding).toBe(4);
    expect(normalized.distanceMultiplier).toBe(1);
    expect(normalized.linkDistancePadding).toBe(4);
    expect(normalized.linkStrengthMultiplier).toBe(1);
    expect(normalized.repelStrength).toBe(-18);
    expect(normalized.sizeDistanceMultiplier).toBe(1);
    expect(normalized.sizeMultiplier).toBe(1);
    expect(normalized.sizeRepelMultiplier).toBe(1);
  });

  it('turns slider values into bounded graph force ranges', () => {
    const low = normalizeForceSettings({
      center: -20,
      distance: -20,
      link: -20,
      repel: -20,
      size: -20,
    });
    const high = normalizeForceSettings({
      center: 120,
      distance: 120,
      link: 120,
      repel: 120,
      size: 120,
    });

    expect(low.centerStrength).toBe(0.008);
    expect(high.centerStrength).toBe(0.046);
    expect(low.collisionIterations).toBe(2);
    expect(high.collisionIterations).toBe(9);
    expect(low.collisionPadding).toBe(4);
    expect(high.collisionPadding).toBe(33);
    expect(low.distanceMultiplier).toBe(0.35);
    expect(high.distanceMultiplier).toBe(2);
    expect(low.linkDistancePadding).toBe(4);
    expect(high.linkDistancePadding).toBe(11.25);
    expect(low.linkStrengthMultiplier).toBe(0);
    expect(high.linkStrengthMultiplier).toBe(6.7);
    expect(low.repelStrength).toBe(-6);
    expect(high.repelStrength).toBe(-90);
    expect(low.sizeDistanceMultiplier).toBe(1);
    expect(high.sizeDistanceMultiplier).toBeCloseTo(2.704);
    expect(low.sizeMultiplier).toBe(0.75);
    expect(high.sizeMultiplier).toBe(3.9);
    expect(low.sizeRepelMultiplier).toBe(1);
    expect(high.sizeRepelMultiplier).toBeCloseTo(5.386);
  });

  it('makes the public slider extremes visibly stronger while preserving readable defaults', () => {
    const loose = normalizeForceSettings({
      ...defaultForceNodeSettings,
      distance: 0,
      link: 0,
      repel: 0,
      size: 0,
    });
    const dramatic = normalizeForceSettings({
      ...defaultForceNodeSettings,
      distance: 100,
      link: 100,
      repel: 100,
      size: 100,
    });

    expect(dramatic.distanceMultiplier).toBeGreaterThanOrEqual(loose.distanceMultiplier * 5);
    expect(dramatic.linkStrengthMultiplier).toBeGreaterThanOrEqual(6);
    expect(Math.abs(dramatic.repelStrength)).toBeGreaterThanOrEqual(Math.abs(loose.repelStrength) * 15);
    expect(dramatic.sizeDistanceMultiplier).toBeGreaterThanOrEqual(2);
    expect(dramatic.sizeMultiplier).toBeGreaterThanOrEqual(loose.sizeMultiplier * 5);
    expect(dramatic.sizeRepelMultiplier).toBeGreaterThanOrEqual(4);
  });
});
