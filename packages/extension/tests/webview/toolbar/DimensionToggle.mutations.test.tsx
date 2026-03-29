import { describe, expect, it } from 'vitest';
import { getDimensionToggleTooltipLabel } from '../../../src/webview/components/toolbar/DimensionToggle';

describe('DimensionToggle tooltip label', () => {
  it('returns the 2d label in 2d mode', () => {
    expect(getDimensionToggleTooltipLabel('2d')).toBe('2D Mode');
  });

  it('returns the 3d label in 3d mode', () => {
    expect(getDimensionToggleTooltipLabel('3d')).toBe('3D Mode');
  });
});
