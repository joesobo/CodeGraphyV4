import { describe, expect, it, vi } from 'vitest';
import {
  SETTINGS,
  applyPhysicsSettings,
  createCustomPhysicsInstance,
  createPhysicsInstance,
  getInstalledD3Force,
  havePhysicsSettingsChanged,
  initPhysics,
  type FGNode,
} from '../testSupport';

describe('physics/root settings', () => {
  it('treats missing previous settings as changed', () => {
    expect(havePhysicsSettingsChanged(null, SETTINGS)).toBe(true);
  });

  it('treats matching physics values as unchanged', () => {
    expect(havePhysicsSettingsChanged({ ...SETTINGS }, { ...SETTINGS })).toBe(false);
  });

  it.each([
    ['repelForce', { repelForce: SETTINGS.repelForce + 1 }],
    ['centerForce', { centerForce: SETTINGS.centerForce + 0.01 }],
    ['linkDistance', { linkDistance: SETTINGS.linkDistance + 1 }],
    ['linkForce', { linkForce: SETTINGS.linkForce + 0.01 }],
    ['damping', { damping: SETTINGS.damping + 0.01 }],
  ])('detects %s changes', (_field, patch) => {
    expect(havePhysicsSettingsChanged(SETTINGS, {
      ...SETTINGS,
      ...patch,
    })).toBe(true);
  });

  it('applies root force strengths and reheats the simulation', () => {
    const { charge, forceXInstance, forceYInstance, instance, link } = createPhysicsInstance();

    applyPhysicsSettings(instance, SETTINGS);

    expect(instance.d3Force).toHaveBeenCalledWith('center', null);
    expect(charge.strength).toHaveBeenCalledOnce();
    expect(charge.distanceMax).toHaveBeenCalledWith(1000);
    expect(link.distance).toHaveBeenCalledWith(SETTINGS.linkDistance);
    expect(link.strength).toHaveBeenCalledWith(SETTINGS.linkForce);
    expect(forceXInstance.strength).toHaveBeenCalledWith(expect.any(Function));
    expect(forceYInstance.strength).toHaveBeenCalledWith(expect.any(Function));
    expect(instance.d3ReheatSimulation).toHaveBeenCalledOnce();
  });

  it('zeros charge for actively dragged nodes only', () => {
    const { charge, instance } = createPhysicsInstance();

    applyPhysicsSettings(instance, SETTINGS);
    const strength = charge.strength.mock.calls[0][0] as (node: FGNode) => number;

    expect(strength({ id: 'src/dragged.ts', isDragging: true } as FGNode)).toBe(0);
    expect(strength({ id: 'src/app.ts' } as FGNode)).toBeLessThan(0);
  });

  it('skips non-callable strength forces and still reheats the simulation', () => {
    const { instance } = createCustomPhysicsInstance({
      charge: { strength: SETTINGS.repelForce },
      forceX: { strength: SETTINGS.centerForce },
      forceY: { strength: SETTINGS.centerForce },
      link: { distance: vi.fn(), strength: vi.fn() },
    });

    expect(() => applyPhysicsSettings(instance, SETTINGS)).not.toThrow();
    expect(instance.d3ReheatSimulation).toHaveBeenCalledOnce();
  });

  it('skips incomplete link forces and still reheats the simulation', () => {
    const withoutDistance = createCustomPhysicsInstance({
      charge: { strength: vi.fn() },
      forceX: { strength: vi.fn() },
      forceY: { strength: vi.fn() },
      link: { strength: vi.fn() },
    });
    const withoutStrength = createCustomPhysicsInstance({
      charge: { strength: vi.fn() },
      forceX: { strength: vi.fn() },
      forceY: { strength: vi.fn() },
      link: { distance: vi.fn() },
    });

    expect(() => applyPhysicsSettings(withoutDistance.instance, SETTINGS)).not.toThrow();
    expect(() => applyPhysicsSettings(withoutStrength.instance, SETTINGS)).not.toThrow();
    expect(withoutDistance.instance.d3ReheatSimulation).toHaveBeenCalledOnce();
    expect(withoutStrength.instance.d3ReheatSimulation).toHaveBeenCalledOnce();
  });

  it('initializes the center and collision forces', () => {
    const { d3Force, instance } = createPhysicsInstance();

    initPhysics(instance, SETTINGS);

    expect(d3Force).toHaveBeenCalledWith('center', null);
    expect(d3Force).toHaveBeenCalledWith('forceX', expect.anything());
    expect(d3Force).toHaveBeenCalledWith('forceY', expect.anything());
    expect(d3Force).toHaveBeenCalledWith('collision', expect.anything());
    expect(instance.d3ReheatSimulation).toHaveBeenCalledTimes(2);
  });

  it('uses node size plus padding for the collision radius', () => {
    const { d3Force, instance } = createPhysicsInstance();

    initPhysics(instance, SETTINGS);
    const collisionForce = getInstalledD3Force<{
      radius: () => (node: { size: number }) => number;
      iterations: () => number;
    }>(d3Force, 'collision');

    expect(collisionForce.radius()({ size: 9 })).toBe(13);
    expect(collisionForce.iterations()).toBe(16);
  });

  it('uses sized rectangle bounds for the collision radius', () => {
    const { d3Force, instance } = createPhysicsInstance();

    initPhysics(instance, SETTINGS);
    const collisionForce = getInstalledD3Force<{
      radius: () => (node: FGNode) => number;
    }>(d3Force, 'collision');

    expect(collisionForce.radius()({
      id: 'section-ui',
      size: 9,
      shape2D: 'rectangle',
      shapeSize2D: {
        height: 80,
        width: 120,
      },
    } as FGNode)).toBe(76.11102550927978);
  });
});
