import { describe, expect, it, vi } from 'vitest';
import type { IPhysicsSettings } from '../../../../src/shared/settings/physics';
import {
  applyPhysicsSettings,
  createGraphSectionBoundsForce,
  getGraphCollisionRadius,
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

  it('keeps expanded Graph Sections from using normal many-body charge', () => {
    const { charge, instance } = createPhysicsInstance();

    applyPhysicsSettings(instance, SETTINGS);

    const strength = charge.strength.mock.calls[0][0] as (node: FGNode) => number;
    expect(strength({
      id: 'section-1',
      isCollapsedGraphSection: false,
      isGraphSection: true,
    } as FGNode)).toBe(0);
    expect(strength({
      id: 'src/app.ts',
    } as FGNode)).toBeLessThan(0);
    expect(strength({
      id: 'section-2',
      isCollapsedGraphSection: true,
      isGraphSection: true,
    } as FGNode)).toBeLessThan(0);
  });

  it('uses the fixed graph charge range', () => {
    const { charge, instance } = createPhysicsInstance();

    applyPhysicsSettings(instance, SETTINGS);

    expect(charge.distanceMax).toHaveBeenCalledWith(1000);
  });

  it('does not give expanded Graph Sections a second native circular collision radius', () => {
    expect(getGraphCollisionRadius({
      id: 'section-1',
      isGraphSection: true,
      sectionHeight: 220,
      sectionWidth: 320,
      size: 48,
    } as FGNode)).toBe(0);
    expect(getGraphCollisionRadius({
      id: 'section-2',
      isCollapsedGraphSection: true,
      isGraphSection: true,
      size: 36,
    } as FGNode)).toBe(40);
    expect(getGraphCollisionRadius({
      id: 'src/app.ts',
      size: 12,
    } as FGNode)).toBe(16);
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

  it('keeps expanded Graph Sections out of the native circular collision force', () => {
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
    } as FGNode)).toBe(0);
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
        x: 100,
        y: 70,
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

    expect(nodes[1].x).toBeLessThanOrEqual(168);
    expect(nodes[1].y).toBeGreaterThanOrEqual(60);
    expect(nodes[1].vx).toBeLessThan(0);
    expect(nodes[1].vy).toBeGreaterThan(0);
  });

  it('pushes overlapping expanded Graph Section rectangles apart by their actual bounds', () => {
    const force = createGraphSectionBoundsForce({
      ...GRAPH_LAYOUT,
      sections: {
        'section-1': GRAPH_LAYOUT.sections['section-1'],
        'section-2': {
          id: 'section-2',
          label: 'Data Layer',
          color: '#22c55e',
          x: 40,
          y: 0,
          width: 200,
          height: 140,
          collapsed: false,
          updatedAt: '2026-05-07T09:00:00.000Z',
        },
      },
      ownership: {
        ...GRAPH_LAYOUT.ownership,
      },
    });
    const nodes = [
      {
        id: 'section-1',
        isGraphSection: true,
        sectionHeight: 140,
        sectionWidth: 200,
        vx: 0,
        vy: 0,
        x: 100,
        y: 70,
      },
      {
        id: 'section-2',
        isGraphSection: true,
        sectionHeight: 140,
        sectionWidth: 200,
        vx: 0,
        vy: 0,
        x: 180,
        y: 70,
      },
    ] as FGNode[];

    force.initialize(nodes);
    force(0.5);

    expect(nodes[0].vx).toBeLessThan(0);
    expect(nodes[1].vx).toBeGreaterThan(0);
    expect(nodes[0].vy).toBe(0);
    expect(nodes[1].vy).toBe(0);
  });

  it('resolves overlapping expanded Graph Section rectangle positions without waiting on velocity drift', () => {
    const force = createGraphSectionBoundsForce({
      ...GRAPH_LAYOUT,
      sections: {
        'section-1': GRAPH_LAYOUT.sections['section-1'],
        'section-2': {
          id: 'section-2',
          label: 'Data Layer',
          color: '#22c55e',
          x: 40,
          y: 0,
          width: 200,
          height: 140,
          collapsed: false,
          updatedAt: '2026-05-07T09:00:00.000Z',
        },
      },
      ownership: {
        ...GRAPH_LAYOUT.ownership,
      },
    });
    const nodes = [
      {
        id: 'section-1',
        isGraphSection: true,
        sectionHeight: 140,
        sectionWidth: 200,
        vx: 0,
        vy: 0,
        x: 100,
        y: 70,
      },
      {
        id: 'section-2',
        isGraphSection: true,
        sectionHeight: 140,
        sectionWidth: 200,
        vx: 0,
        vy: 0,
        x: 180,
        y: 70,
      },
    ] as FGNode[];

    force.initialize(nodes);
    force(0.5);

    const sectionOneRight = nodes[0].x! + 100;
    const sectionTwoLeft = nodes[1].x! - 100;
    expect(sectionOneRight).toBeLessThanOrEqual(sectionTwoLeft);
  });

  it('does not let many loose nodes collectively launch an expanded Graph Section', () => {
    const force = createGraphSectionBoundsForce(GRAPH_LAYOUT);
    const nodes = [
      {
        id: 'section-1',
        isGraphSection: true,
        sectionHeight: 140,
        sectionWidth: 200,
        vx: 0,
        vy: 0,
        x: 100,
        y: 70,
      },
      ...Array.from({ length: 10 }, (_, index) => ({
        id: `src/loose-${index}.ts`,
        size: 10,
        vx: 0,
        vy: 0,
        x: 145 + (index % 2) * 12,
        y: 70 + index * 4,
      })),
    ] as FGNode[];

    force.initialize(nodes);
    force(0.5);

    expect(Math.abs(nodes[0].vx ?? 0)).toBeLessThanOrEqual(8);
    expect(Math.abs(nodes[0].vy ?? 0)).toBeLessThanOrEqual(8);
    expect(nodes.slice(1).some(node => Math.abs(node.vx ?? 0) > 0 || Math.abs(node.vy ?? 0) > 0)).toBe(true);
  });

  it('lets expanded Graph Sections exchange collision pressure with normal nodes', () => {
    const force = createGraphSectionBoundsForce(GRAPH_LAYOUT);
    const nodes = [
      {
        id: 'section-1',
        isGraphSection: true,
        sectionHeight: 140,
        sectionWidth: 200,
        vx: 0,
        vy: 0,
        x: 100,
        y: 70,
      },
      {
        id: 'src/loose.ts',
        size: 10,
        vx: 0,
        vy: 0,
        x: 190,
        y: 70,
      },
    ] as FGNode[];

    force.initialize(nodes);
    force(0.5);

    expect(Math.abs(nodes[0].vx ?? 0)).toBeGreaterThanOrEqual(Math.abs(nodes[1].vx ?? 0) * 0.75);
    expect(nodes[0].vx).toBeLessThan(0);
    expect(nodes[1].vx).toBeGreaterThan(0);
  });

  it('does not let members from another expanded Graph Section inflate a section collision boundary', () => {
    const force = createGraphSectionBoundsForce({
      ...GRAPH_LAYOUT,
      sections: {
        'section-1': GRAPH_LAYOUT.sections['section-1'],
        'section-2': {
          id: 'section-2',
          label: 'Data Layer',
          color: '#22c55e',
          x: 300,
          y: 0,
          width: 200,
          height: 140,
          collapsed: false,
          updatedAt: '2026-05-07T09:00:00.000Z',
        },
      },
      ownership: {
        ...GRAPH_LAYOUT.ownership,
        'section-2': {
          itemId: 'section-2',
          itemKind: 'section',
          ownerSectionId: null,
          updatedAt: '2026-05-07T09:00:00.000Z',
        },
        'src/other-member.ts': {
          itemId: 'src/other-member.ts',
          itemKind: 'node',
          ownerSectionId: 'section-2',
          updatedAt: '2026-05-07T09:00:00.000Z',
        },
      },
    });
    const nodes = [
      {
        id: 'section-1',
        isGraphSection: true,
        sectionHeight: 140,
        sectionWidth: 200,
        vx: 0,
        vy: 0,
        x: 100,
        y: 70,
      },
      {
        id: 'section-2',
        isGraphSection: true,
        sectionHeight: 140,
        sectionWidth: 200,
        vx: 0,
        vy: 0,
        x: 400,
        y: 70,
      },
      {
        id: 'src/other-member.ts',
        ownerSectionId: 'section-2',
        size: 10,
        vx: 0,
        vy: 0,
        x: 100,
        y: 70,
      },
    ] as FGNode[];

    force.initialize(nodes);
    force(0.5);

    expect(nodes[0].vx).toBe(0);
    expect(nodes[0].vy).toBe(0);
  });

  it('does not push nested Graph Section rectangles out of their owner section', () => {
    const force = createGraphSectionBoundsForce({
      ...GRAPH_LAYOUT,
      sections: {
        'section-1': GRAPH_LAYOUT.sections['section-1'],
        'section-2': {
          id: 'section-2',
          label: 'Nested',
          color: '#22c55e',
          x: 40,
          y: 40,
          width: 80,
          height: 80,
          collapsed: false,
          updatedAt: '2026-05-07T09:00:00.000Z',
        },
      },
      ownership: {
        ...GRAPH_LAYOUT.ownership,
        'section-2': {
          itemId: 'section-2',
          itemKind: 'section',
          ownerSectionId: 'section-1',
          updatedAt: '2026-05-07T09:00:00.000Z',
        },
      },
    });
    const nodes = [
      {
        id: 'section-1',
        isGraphSection: true,
        sectionHeight: 140,
        sectionWidth: 200,
        vx: 0,
        vy: 0,
        x: 100,
        y: 70,
      },
      {
        id: 'section-2',
        isGraphSection: true,
        sectionHeight: 80,
        sectionWidth: 80,
        vx: 0,
        vy: 0,
        x: 80,
        y: 80,
      },
    ] as FGNode[];

    force.initialize(nodes);
    force(0.5);

    expect(nodes[0]).toMatchObject({ vx: 0, vy: 0 });
    expect(nodes[1]).toMatchObject({ vx: 0, vy: 0 });
  });

  it('does not let owned members accelerate their expanded Graph Section frame', () => {
    const force = createGraphSectionBoundsForce(GRAPH_LAYOUT);
    const nodes = [
      {
        id: 'section-1',
        isGraphSection: true,
        sectionHeight: 140,
        sectionWidth: 200,
        vx: 0,
        vy: 0,
        x: 100,
        y: 70,
      },
      {
        id: 'src/member.ts',
        ownerSectionId: 'section-1',
        size: 10,
        vx: 0,
        vy: 0,
        x: 400,
        y: 400,
      },
    ] as FGNode[];

    force.initialize(nodes);
    force(0.5);

    expect(nodes[0].vx).toBe(0);
    expect(nodes[0].vy).toBe(0);
  });

  it('carries Section Members with their expanded Graph Section frame between ticks', () => {
    const force = createGraphSectionBoundsForce(GRAPH_LAYOUT);
    const nodes = [
      {
        id: 'section-1',
        isGraphSection: true,
        sectionHeight: 140,
        sectionWidth: 200,
        vx: 0,
        vy: 0,
        x: 100,
        y: 70,
      },
      {
        id: 'src/member.ts',
        ownerSectionId: 'section-1',
        size: 10,
        vx: 0,
        vy: 0,
        x: 120,
        y: 110,
      },
    ] as FGNode[];

    force.initialize(nodes);
    force(0.5);
    nodes[0].x = 140;
    nodes[0].y = 100;
    force(0.5);

    expect(nodes[1].x).toBe(160);
    expect(nodes[1].y).toBe(140);
  });

  it('keeps Section Members below the Section Frame header', () => {
    const force = createGraphSectionBoundsForce(GRAPH_LAYOUT);
    const nodes = [
      {
        id: 'section-1',
        isGraphSection: true,
        sectionHeight: 140,
        sectionWidth: 200,
        x: 100,
        y: 70,
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

    expect(nodes[1].y).toBeGreaterThanOrEqual(54);
  });

  it('keeps Section Members clear of the body edges for visible labels', () => {
    const force = createGraphSectionBoundsForce(GRAPH_LAYOUT);
    const nodes = [
      {
        id: 'section-1',
        isGraphSection: true,
        sectionHeight: 100,
        sectionWidth: 100,
        x: 50,
        y: 50,
      },
      {
        id: 'src/member.ts',
        ownerSectionId: 'section-1',
        size: 10,
        vx: 0,
        vy: 0,
        x: 95,
        y: 95,
      },
    ] as FGNode[];

    force.initialize(nodes);
    force(0.5);

    expect(nodes[1].x).toBeLessThanOrEqual(74);
    expect(nodes[1].y).toBeLessThanOrEqual(74);
  });

  it('leaves pinned Section Members fixed when they are already inside the owner frame', () => {
    const force = createGraphSectionBoundsForce(GRAPH_LAYOUT);
    const nodes = [
      {
        id: 'section-1',
        isGraphSection: true,
        sectionHeight: 140,
        sectionWidth: 200,
        x: 100,
        y: 70,
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

  it('applies peer collision pressure to nodes without section ownership inside expanded section bounds', () => {
    const force = createGraphSectionBoundsForce(GRAPH_LAYOUT);
    const nodes = [
      {
        id: 'section-1',
        isGraphSection: true,
        sectionHeight: 100,
        sectionWidth: 100,
        x: 50,
        y: 50,
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
    expect(Math.abs(nodes[0].vx ?? 0) + Math.abs(nodes[0].vy ?? 0)).toBeGreaterThan(0);
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
        x: 50,
        y: 50,
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
    expect(nodes[0]).toMatchObject({
      x: 50,
      y: 50,
    });
    expect(nodes[0].vx ?? 0).toBe(0);
    expect(nodes[0].vy ?? 0).toBe(0);
  });

  it('allows actively dragged Section Members to leave owner bounds before drop', () => {
    const force = createGraphSectionBoundsForce(GRAPH_LAYOUT);
    const nodes = [
      {
        id: 'section-1',
        isGraphSection: true,
        sectionHeight: 100,
        sectionWidth: 100,
        x: 50,
        y: 50,
      },
      {
        id: 'src/member.ts',
        isDragging: true,
        ownerSectionId: 'section-1',
        size: 10,
        vx: 0,
        vy: 0,
        x: 160,
        y: 160,
      },
    ] as FGNode[];

    force.initialize(nodes);
    force(0.5);

    expect(nodes[1]).toMatchObject({
      vx: 0,
      vy: 0,
      x: 160,
      y: 160,
    });
  });
});
