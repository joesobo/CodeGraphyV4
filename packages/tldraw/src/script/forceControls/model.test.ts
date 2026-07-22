import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FORCE_SETTINGS,
  FORCE_CONTROLS,
  readForceSettings,
  toGraphLayoutConfig,
} from './model';

describe('tldraw force controls', () => {
  it('matches the Extension slider definitions', () => {
    expect(FORCE_CONTROLS).toEqual([
      { key: 'repelForce', label: 'Repel Force', minimum: 0, maximum: 20, step: 1, decimals: 0 },
      { key: 'centerForce', label: 'Center Force', minimum: 0, maximum: 1, step: 0.01, decimals: 2 },
      { key: 'linkDistance', label: 'Link Distance', minimum: 30, maximum: 500, step: 10, decimals: 0 },
      { key: 'linkForce', label: 'Link Force', minimum: 0, maximum: 2, step: 0.01, decimals: 2 },
    ]);
  });

  it('starts with the requested values', () => {
    expect(DEFAULT_FORCE_SETTINGS).toEqual({
      repelForce: 18,
      centerForce: 0.15,
      linkDistance: 80,
      linkForce: 2,
    });
  });

  it('maps the controls to the shared graph-renderer configuration', () => {
    expect(toGraphLayoutConfig(DEFAULT_FORCE_SETTINGS)).toEqual({
      centralGravity: 0.15,
      chargeStrength: -450,
      linkDistance: 80,
      linkStrength: 2,
    });
  });

  it('uses bounded defaults for missing or invalid document values', () => {
    expect(readForceSettings({
      repelForce: 100,
      centerForce: Number.NaN,
      linkDistance: 20,
      linkForce: 'strong',
    })).toEqual({
      repelForce: 20,
      centerForce: 0.15,
      linkDistance: 30,
      linkForce: 2,
    });
  });
});
