import { describe, expect, it, vi } from 'vitest';
import type { IPhysicsSettings } from '../../../../src/shared/settings/physics';
import {
  applyPhysicsSettings,
  havePhysicsSettingsChanged,
  initPhysics,
} from '../../../../src/webview/components/graph/runtime/physics';

const SETTINGS: IPhysicsSettings = {
  centerForce: 0.12,
  damping: 0.7,
  linkDistance: 140,
  linkForce: 0.33,
  repelForce: 620,
};

function createPhysicsInstance() {
  const charge = { distanceMax: vi.fn(), strength: vi.fn() };
  const link = { distance: vi.fn(), strength: vi.fn() };
  const forceXInstance = { strength: vi.fn() };
  const forceYInstance = { strength: vi.fn() };
  const d3Force = vi.fn((name: string, value?: unknown) => {
    if (value !== undefined) return value;
    if (name === 'charge') return charge;
    if (name === 'link') return link;
    if (name === 'forceX') return forceXInstance;
    if (name === 'forceY') return forceYInstance;
    return undefined;
  });

  return {
    charge,
    d3Force,
    forceXInstance,
    forceYInstance,
    instance: {
      d3Force,
      d3ReheatSimulation: vi.fn(),
    } as unknown as Parameters<typeof applyPhysicsSettings>[0],
    link,
  };
}

function createCustomPhysicsInstance(forces: {
  charge?: unknown;
  forceX?: unknown;
  forceY?: unknown;
  link?: unknown;
} = {}) {
  const d3Force = vi.fn((name: string) => {
    if (name === 'charge') return forces.charge;
    if (name === 'link') return forces.link;
    if (name === 'forceX') return forces.forceX;
    if (name === 'forceY') return forces.forceY;
    return undefined;
  });

  return {
    instance: {
      d3Force,
      d3ReheatSimulation: vi.fn(),
    } as unknown as Parameters<typeof applyPhysicsSettings>[0],
  };
}

describe('physics', () => {
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

  it('applies force strengths and reheats the simulation', () => {
    const { charge, forceXInstance, forceYInstance, instance, link } = createPhysicsInstance();

    applyPhysicsSettings(instance, SETTINGS);

    expect(charge.strength).toHaveBeenCalledOnce();
    expect(charge.distanceMax).toHaveBeenCalledWith(1000);
    expect(link.distance).toHaveBeenCalledWith(SETTINGS.linkDistance);
    expect(link.strength).toHaveBeenCalledWith(SETTINGS.linkForce);
    expect(forceXInstance.strength).toHaveBeenCalledWith(SETTINGS.centerForce);
    expect(forceYInstance.strength).toHaveBeenCalledWith(SETTINGS.centerForce);
    expect(instance.d3ReheatSimulation).toHaveBeenCalledOnce();
  });

  it('uses the fixed graph charge range', () => {
    const { charge, instance } = createPhysicsInstance();

    applyPhysicsSettings(instance, SETTINGS);

    expect(charge.distanceMax).toHaveBeenCalledWith(1000);
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

  it('skips link forces without a distance function and still reheats the simulation', () => {
    const { instance } = createCustomPhysicsInstance({
      charge: { strength: vi.fn() },
      forceX: { strength: vi.fn() },
      forceY: { strength: vi.fn() },
      link: { strength: vi.fn() },
    });

    expect(() => applyPhysicsSettings(instance, SETTINGS)).not.toThrow();
    expect(instance.d3ReheatSimulation).toHaveBeenCalledOnce();
  });

  it('skips link forces without a strength function and still reheats the simulation', () => {
    const { instance } = createCustomPhysicsInstance({
      charge: { strength: vi.fn() },
      forceX: { strength: vi.fn() },
      forceY: { strength: vi.fn() },
      link: { distance: vi.fn() },
    });

    expect(() => applyPhysicsSettings(instance, SETTINGS)).not.toThrow();
    expect(instance.d3ReheatSimulation).toHaveBeenCalledOnce();
  });

  it('initializes the center and collision forces', () => {
    const { d3Force, instance } = createPhysicsInstance();

    initPhysics(instance, SETTINGS);

    expect(d3Force).toHaveBeenCalledWith('forceX', expect.anything());
    expect(d3Force).toHaveBeenCalledWith('forceY', expect.anything());
    expect(d3Force).toHaveBeenCalledWith('collision', expect.anything());
    expect(instance.d3ReheatSimulation).toHaveBeenCalledTimes(2);
  });

  it('uses node size plus padding for the collision radius', () => {
    const { d3Force, instance } = createPhysicsInstance();

    initPhysics(instance, SETTINGS);

    const collisionForce = d3Force.mock.calls.find(([name]) => name === 'collision')?.[1] as {
      radius: () => (node: { size: number }) => number;
      iterations: () => number;
    };

    expect(collisionForce.radius()({ size: 9 })).toBe(13);
    expect(collisionForce.iterations()).toBe(16);
  });
});
