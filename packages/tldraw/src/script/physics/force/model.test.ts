import { describe, expect, it } from 'vitest';
import { forceSettingsChanged } from './model';

const SETTINGS = {
  repelForce: 10,
  centerForce: 0.1,
  linkDistance: 80,
  linkForce: 1,
};

describe('physics force setting changes', () => {
  it('detects each user-controlled force independently', () => {
    expect(forceSettingsChanged(SETTINGS, { ...SETTINGS })).toBe(false);
    expect(forceSettingsChanged(SETTINGS, { ...SETTINGS, repelForce: 11 })).toBe(true);
    expect(forceSettingsChanged(SETTINGS, { ...SETTINGS, centerForce: 0.2 })).toBe(true);
    expect(forceSettingsChanged(SETTINGS, { ...SETTINGS, linkDistance: 90 })).toBe(true);
    expect(forceSettingsChanged(SETTINGS, { ...SETTINGS, linkForce: 1.5 })).toBe(true);
  });
});
