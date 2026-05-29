import { expect, vi } from 'vitest';
import { forceManyBody, forceSimulation, type Force } from 'd3-force';
import type { IPhysicsSettings } from '../../../../../src/shared/settings/physics';
import {
  applyPhysicsSettings,
  getGraphCollisionRadius,
  havePhysicsSettingsChanged,
  initPhysics,
} from '../../../../../src/webview/components/graph/runtime/physics';
import type { FGNode } from '../../../../../src/webview/components/graph/model/build';

export { forceManyBody, forceSimulation };
export {
  applyPhysicsSettings,
  getGraphCollisionRadius,
  havePhysicsSettingsChanged,
  initPhysics,
};
export type { FGNode, IPhysicsSettings, Force };

export const SETTINGS: IPhysicsSettings = {
  centerForce: 0.12,
  damping: 0.7,
  linkDistance: 140,
  linkForce: 0.33,
  repelForce: 620,
};

export function createPhysicsInstance() {
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

export function getInstalledD3Force<T>(
  d3Force: ReturnType<typeof createPhysicsInstance>['d3Force'],
  name: string,
): T {
  const call = [...d3Force.mock.calls].reverse().find(([forceName, value]) => forceName === name && value !== undefined);
  expect(call).toBeDefined();
  return call?.[1] as T;
}

export function createCustomPhysicsInstance(forces: {
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

export function createD3PhysicsInstance() {
  const forces: Record<string, Force<FGNode, undefined> | undefined> = {
    charge: forceManyBody<FGNode>(),
  };
  const d3Force = vi.fn((name: string, value?: unknown) => {
    if (value !== undefined) {
      forces[name] = value as Force<FGNode, undefined>;
      return value;
    }

    return forces[name];
  });

  return {
    d3Force,
    forces,
    instance: {
      d3Force,
      d3ReheatSimulation: vi.fn(),
    } as unknown as Parameters<typeof applyPhysicsSettings>[0],
  };
}
