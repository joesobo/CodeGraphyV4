import { describe, expect, it, vi } from 'vitest';
import type { IPhysicsSettings } from '../../../../src/shared/settings/physics';
import {
  applyPhysicsSettings,
  createGraphSectionBoundsForce,
  havePhysicsSettingsChanged,
  initPhysics,
} from '../../../../src/webview/components/graph/runtime/physics';
import type { FGNode } from '../../../../src/webview/components/graph/model/build';
import type { GraphLayoutSettings } from '../../../../src/shared/settings/graphLayout';

const SETTINGS: IPhysicsSettings = {
  centerForce: 0.12,
  damping: 0.7,
  linkDistance: 140,
  linkForce: 0.33,
  repelForce: 620,
};

const GRAPH_LAYOUT: GraphLayoutSettings = {
  pinnedNodes: {},
  sections: {
    'section-1': {
      id: 'section-1',
      label: 'UI Layer',
      color: '#60a5fa',
      x: 0,
      y: 0,
      width: 200,
      height: 140,
      collapsed: false,
      updatedAt: '2026-05-07T09:00:00.000Z',
    },
  },
  ownership: {
    'section-1': {
      itemId: 'section-1',
      itemKind: 'section',
      ownerSectionId: null,
      updatedAt: '2026-05-07T09:00:00.000Z',
    },
    'src/member.ts': {
      itemId: 'src/member.ts',
      itemKind: 'node',
      ownerSectionId: 'section-1',
      updatedAt: '2026-05-07T09:00:00.000Z',
    },
  },
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

  it('uses expanded Graph Section dimensions for the collision radius', () => {
    const { d3Force, instance } = createPhysicsInstance();

    initPhysics(instance, SETTINGS);

    const collisionForce = d3Force.mock.calls.find(([name]) => name === 'collision')?.[1] as {
      radius: () => (node: FGNode) => number;
    };

    expect(collisionForce.radius()({
      id: 'section-1',
      isGraphSection: true,
      isCollapsedGraphSection: false,
      sectionHeight: 100,
      sectionWidth: 100,
      size: 9,
    } as FGNode)).toBeCloseTo((Math.sqrt(100 ** 2 + 100 ** 2) / 2) + 4);
  });

  it('initializes section bounds forces when Graph Layout is available in 2D', () => {
    const { d3Force, instance } = createPhysicsInstance();

    initPhysics(instance, SETTINGS, { graphLayout: GRAPH_LAYOUT, graphMode: '2d' });

    expect(d3Force).toHaveBeenCalledWith('sectionBounds', expect.any(Function));
  });

  it('does not initialize section bounds forces in 3D', () => {
    const { d3Force, instance } = createPhysicsInstance();

    initPhysics(instance, SETTINGS, { graphLayout: GRAPH_LAYOUT, graphMode: '3d' });

    expect(d3Force).toHaveBeenCalledWith('sectionBounds', null);
  });

  it('keeps Section Members inside the owner frame with gentle center correction', () => {
    const force = createGraphSectionBoundsForce(GRAPH_LAYOUT);
    const nodes = [
      {
        id: 'section-1',
        isGraphSection: true,
        sectionHeight: 140,
        sectionWidth: 200,
        x: 10,
        y: 20,
      },
      {
        id: 'src/member.ts',
        ownerSectionId: 'section-1',
        size: 16,
        vx: 0,
        vy: 0,
        x: 260,
        y: -40,
      },
    ] as FGNode[];

    force.initialize(nodes);
    force(0.5);

    expect(nodes[1].x).toBeLessThanOrEqual(10 + 200 - nodes[1].size);
    expect(nodes[1].y).toBeGreaterThanOrEqual(20 + nodes[1].size);
    expect(nodes[1].vx).toBeLessThan(0);
    expect(nodes[1].vy).toBeGreaterThan(0);
  });

  it('keeps Section Members below the Section Frame header', () => {
    const force = createGraphSectionBoundsForce(GRAPH_LAYOUT);
    const nodes = [
      {
        id: 'section-1',
        isGraphSection: true,
        sectionHeight: 140,
        sectionWidth: 200,
        x: 0,
        y: 0,
      },
      {
        id: 'src/member.ts',
        ownerSectionId: 'section-1',
        size: 10,
        vx: 0,
        vy: 0,
        x: 80,
        y: 8,
      },
    ] as FGNode[];

    force.initialize(nodes);
    force(0.5);

    expect(nodes[1].y).toBeGreaterThanOrEqual(46);
  });

  it('leaves pinned Section Members fixed when they are already inside the owner frame', () => {
    const force = createGraphSectionBoundsForce(GRAPH_LAYOUT);
    const nodes = [
      {
        id: 'section-1',
        isGraphSection: true,
        sectionHeight: 140,
        sectionWidth: 200,
        x: 0,
        y: 0,
      },
      {
        fx: 60,
        fy: 60,
        id: 'src/member.ts',
        ownerSectionId: 'section-1',
        size: 16,
        vx: 0,
        vy: 0,
        x: 60,
        y: 60,
      },
    ] as FGNode[];

    force.initialize(nodes);
    force(0.5);

    expect(nodes[1]).toMatchObject({
      fx: 60,
      fy: 60,
      vx: 0,
      vy: 0,
      x: 60,
      y: 60,
    });
  });

  it('pushes nodes without section ownership outside expanded section bounds', () => {
    const force = createGraphSectionBoundsForce(GRAPH_LAYOUT);
    const nodes = [
      {
        id: 'section-1',
        isGraphSection: true,
        sectionHeight: 100,
        sectionWidth: 100,
        x: 0,
        y: 0,
      },
      {
        id: 'src/outside.ts',
        size: 10,
        vx: 0,
        vy: 0,
        x: 50,
        y: 50,
      },
    ] as FGNode[];

    force.initialize(nodes);
    force(0.5);

    const outside = nodes[1];
    const left = outside.x! <= -18;
    const right = outside.x! >= 118;
    const above = outside.y! <= -18;
    const below = outside.y! >= 118;
    expect(left || right || above || below).toBe(true);
    expect(Math.abs(outside.vx ?? 0) + Math.abs(outside.vy ?? 0)).toBeGreaterThan(0);
  });

  it('allows actively dragged nodes to enter expanded section bounds before ownership is saved', () => {
    const force = createGraphSectionBoundsForce(GRAPH_LAYOUT);
    const nodes = [
      {
        id: 'section-1',
        isGraphSection: true,
        sectionHeight: 100,
        sectionWidth: 100,
        x: 0,
        y: 0,
      },
      {
        id: 'src/dragged.ts',
        isDragging: true,
        size: 10,
        vx: 0,
        vy: 0,
        x: 50,
        y: 50,
      },
    ] as FGNode[];

    force.initialize(nodes);
    force(0.5);

    expect(nodes[1]).toMatchObject({
      vx: 0,
      vy: 0,
      x: 50,
      y: 50,
    });
  });
});
