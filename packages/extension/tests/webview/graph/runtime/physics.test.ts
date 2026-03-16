import { describe, expect, it, vi } from 'vitest';
import type { IPhysicsSettings } from '../../../../src/shared/types';
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
  const charge = { strength: vi.fn() };
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

describe('physics', () => {
  it('detects changed physics settings', () => {
    expect(havePhysicsSettingsChanged(null, SETTINGS)).toBe(true);
    expect(havePhysicsSettingsChanged(SETTINGS, SETTINGS)).toBe(false);
    expect(havePhysicsSettingsChanged(SETTINGS, {
      ...SETTINGS,
      linkDistance: SETTINGS.linkDistance + 1,
    })).toBe(true);
  });

  it('applies force strengths and reheats the simulation', () => {
    const { charge, forceXInstance, forceYInstance, instance, link } = createPhysicsInstance();

    applyPhysicsSettings(instance, SETTINGS);

    expect(charge.strength).toHaveBeenCalledOnce();
    expect(link.distance).toHaveBeenCalledWith(SETTINGS.linkDistance);
    expect(link.strength).toHaveBeenCalledWith(SETTINGS.linkForce);
    expect(forceXInstance.strength).toHaveBeenCalledWith(SETTINGS.centerForce);
    expect(forceYInstance.strength).toHaveBeenCalledWith(SETTINGS.centerForce);
    expect(instance.d3ReheatSimulation).toHaveBeenCalledOnce();
  });

  it('initializes the center and collision forces', () => {
    const { d3Force, instance } = createPhysicsInstance();

    initPhysics(instance, SETTINGS);

    expect(d3Force).toHaveBeenCalledWith('forceX', expect.anything());
    expect(d3Force).toHaveBeenCalledWith('forceY', expect.anything());
    expect(d3Force).toHaveBeenCalledWith('collision', expect.anything());
  });
});
