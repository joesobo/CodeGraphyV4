import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_GRAPH_PHYSICS_SETTINGS,
  GRAPH_PHYSICS_CONTROL_LIMITS,
  applyGraphPhysicsSettings,
  toGraphPhysicsLayoutConfig,
  type GraphPhysicsSettings,
} from '../src/index.js';

describe('graph physics contract', () => {
  it('defines the shared defaults and visible control limits', () => {
    expect(DEFAULT_GRAPH_PHYSICS_SETTINGS).toEqual({
      repelForce: 10,
      linkDistance: 80,
      linkForce: 1,
      damping: 0.4,
      centerForce: 0.1,
    });
    expect(GRAPH_PHYSICS_CONTROL_LIMITS).toEqual({
      repelForce: { min: 0, max: 20, step: 1 },
      centerForce: { min: 0, max: 1, step: 0.01 },
      linkDistance: { min: 30, max: 500, step: 10 },
      linkForce: { min: 0, max: 2, step: 0.01 },
    });
  });

  it('maps UI settings to the exact GraphLayoutConfig fields', () => {
    expect(toGraphPhysicsLayoutConfig(DEFAULT_GRAPH_PHYSICS_SETTINGS)).toEqual({
      centralGravity: 0.1,
      chargeStrength: -250,
      linkDistance: 80,
      linkStrength: 1,
      velocityDecay: 0.4,
    });
  });

  it('clamps finite values and falls back for non-finite values', () => {
    const settings: GraphPhysicsSettings = {
      repelForce: 40,
      centerForce: -1,
      linkDistance: Number.NaN,
      linkForce: 3,
      damping: Number.POSITIVE_INFINITY,
    };

    expect(toGraphPhysicsLayoutConfig(settings)).toEqual({
      centralGravity: 0,
      chargeStrength: -500,
      linkDistance: 80,
      linkStrength: 2,
      velocityDecay: 0.4,
    });
  });

  it('applies the mapped config through the renderer boundary', () => {
    const setConfig = vi.fn();

    applyGraphPhysicsSettings({ setConfig }, DEFAULT_GRAPH_PHYSICS_SETTINGS);

    expect(setConfig).toHaveBeenCalledWith({
      centralGravity: 0.1,
      chargeStrength: -250,
      linkDistance: 80,
      linkStrength: 1,
      velocityDecay: 0.4,
    });
  });
});
