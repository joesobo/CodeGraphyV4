import { describe, expect, it } from 'vitest';
import {
  SETTINGS,
  GRAPH_LAYOUT,
  applyPhysicsSettings,
  createCustomPhysicsInstance,
  createD3PhysicsInstance,
  createPhysicsInstance,
  forceSimulation,
  getGraphCollisionRadius,
  getInstalledD3Force,
  getRequiredD3PhysicsForce,
  havePhysicsSettingsChanged,
  initPhysics,
  type FGNode,
  type GraphLayoutSettings,
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

  it('applies force strengths and reheats the simulation', () => {
    const { charge, forceXInstance, forceYInstance, instance, link } = createPhysicsInstance();

    applyPhysicsSettings(instance, SETTINGS);
    expect(instance.d3Force).toHaveBeenCalledWith('center', null);
    expect(charge.strength).toHaveBeenCalledOnce();
    expect(charge.distanceMax).toHaveBeenCalledWith(1000);
    expect(link.distance).toHaveBeenCalledWith(SETTINGS.linkDistance);
    const linkStrength = link.strength.mock.calls[0][0] as (link: {
      source: string;
      target: string;
    }) => number;
    expect(linkStrength({ source: 'src/a.ts', target: 'src/b.ts' })).toBe(SETTINGS.linkForce);
    const forceXStrength = forceXInstance.strength.mock.calls[0][0] as (node: FGNode) => number;
    const forceYStrength = forceYInstance.strength.mock.calls[0][0] as (node: FGNode) => number;
    expect(forceXStrength({ id: 'src/root.ts' } as FGNode)).toBe(SETTINGS.centerForce);
    expect(forceYStrength({ id: 'src/root.ts' } as FGNode)).toBe(SETTINGS.centerForce);
    expect(instance.d3ReheatSimulation).toHaveBeenCalledOnce();
  });

  it('keeps expanded Section Members out of root charge and root link force', () => {
    const { charge, instance, link } = createPhysicsInstance();

    applyPhysicsSettings(instance, SETTINGS, { graphLayout: GRAPH_LAYOUT, graphMode: '2d' });
    const chargeStrength = charge.strength.mock.calls[0][0] as (node: FGNode) => number;
    expect(chargeStrength({
      id: 'section-1',
      isCollapsedGraphSection: false,
      isGraphSection: true,
    } as FGNode)).toBeLessThan(0);
    expect(chargeStrength({
      id: 'src/member.ts',
      ownerSectionId: 'section-1',
    } as FGNode)).toBe(0);
    const linkStrength = link.strength.mock.calls[0][0] as (link: {
      source: FGNode | string;
      target: FGNode | string;
    }) => number;
    expect(linkStrength({
      source: 'src/root.ts',
      target: 'src/member.ts',
    })).toBe(0);
    expect(linkStrength({
      source: { id: 'src/root.ts' } as FGNode,
      target: { id: 'src/other.ts' } as FGNode,
    })).toBe(SETTINGS.linkForce);
  });

  it('does not let root graph charge push expanded Section Members toward section walls', () => {
    const graphLayout = {
      collapsedNodes: {},
      pinnedNodes: {},
    sections: {
        'section-1': {
          id: 'section-1',
          label: 'Godot',
          color: '#60a5fa',
          x: 350,
          y: 0,
          width: 300,
          height: 260,
          collapsed: false,
          updatedAt: '2026-05-12T12:00:00.000Z',
        },
      },
      ownership: {
        'section-1': {
          itemId: 'section-1',
          itemKind: 'section',
          ownerSectionId: null,
          updatedAt: '2026-05-12T12:00:00.000Z',
        },
        'src/member.ts': {
          itemId: 'src/member.ts',
          itemKind: 'node',
          ownerSectionId: 'section-1',
          updatedAt: '2026-05-12T12:00:00.000Z',
        },
      },
    } satisfies GraphLayoutSettings;
    const nodes = [
      {
        id: 'src/root.ts',
        size: 20,
        vx: 0,
        vy: 0,
        x: 0,
        y: 0,
      },
      {
        id: 'section-1',
        isGraphSection: true,
    sectionHeight: 260,
    sectionWidth: 300,
        vx: 0,
        vy: 0,
        x: 350,
        y: 0,
      },
      {
        id: 'src/member.ts',
        ownerSectionId: 'section-1',
        size: 18,
        vx: 0,
        vy: 0,
        x: 350,
        y: 20,
      },
    ] as FGNode[];
    const { forces, instance } = createD3PhysicsInstance();
    const settings = {
      ...SETTINGS,
      centerForce: 0,
      linkForce: 0,
      repelForce: 20,
    };

    initPhysics(instance, settings, { graphLayout, graphMode: '2d' });
    forceSimulation(nodes)
      .velocityDecay(settings.damping)
      .force('charge', getRequiredD3PhysicsForce(forces, 'charge'))
      .force('sectionBounds', getRequiredD3PhysicsForce(forces, 'sectionBounds'))
      .stop()
      .tick();
    expect(nodes[2].x).toBeCloseTo(350, 5);
    expect(nodes[2].vx).toBeCloseTo(0, 5);
  });

  it('keeps expanded Graph Sections in normal many-body charge', () => {
    const { charge, instance } = createPhysicsInstance();

    applyPhysicsSettings(instance, SETTINGS);
    const strength = charge.strength.mock.calls[0][0] as (node: FGNode) => number;
    expect(strength({
      id: 'section-1',
      isCollapsedGraphSection: false,
      isGraphSection: true,
    } as FGNode)).toBeLessThan(0);
    expect(strength({
      id: 'src/app.ts',
    } as FGNode)).toBeLessThan(0);
    expect(strength({
      id: 'section-2',
      isCollapsedGraphSection: true,
      isGraphSection: true,
    } as FGNode)).toBeLessThan(0);
  });

  it('removes dragged expanded Graph Sections from root charge while the user moves them', () => {
    const { charge, instance } = createPhysicsInstance();

    applyPhysicsSettings(instance, SETTINGS, { graphLayout: GRAPH_LAYOUT, graphMode: '2d' });
    const strength = charge.strength.mock.calls[0][0] as (node: FGNode) => number;
    expect(strength({
      id: 'section-1',
      isDragging: true,
      isGraphSection: true,
    } as FGNode)).toBe(0);
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

  it('keeps expanded Graph Sections out of the native circular collision force', () => {
    const { d3Force, instance } = createPhysicsInstance();

    initPhysics(instance, SETTINGS);
    const collisionForce = getInstalledD3Force<{
      radius: () => (node: FGNode) => number;
    }>(d3Force, 'collision');
    expect(collisionForce.radius()({
      id: 'section-1',
      isGraphSection: true,
      isCollapsedGraphSection: false,
    sectionHeight: 100,
    sectionWidth: 100,
      size: 9,
    } as FGNode)).toBe(0);
  });

  it('keeps members of expanded Graph Sections out of root center and circular collision forces', () => {
    const { d3Force, instance } = createPhysicsInstance();

    initPhysics(instance, SETTINGS, { graphLayout: GRAPH_LAYOUT, graphMode: '2d' });
    const collisionForce = getInstalledD3Force<{
      radius: () => (node: FGNode) => number;
    }>(d3Force, 'collision');
    const forceXInstance = getInstalledD3Force<{
      strength: () => (node: FGNode) => number;
    }>(d3Force, 'forceX');
    const forceYInstance = getInstalledD3Force<{
      strength: () => (node: FGNode) => number;
    }>(d3Force, 'forceY');
    const sectionMember = {
      id: 'src/member.ts',
      ownerSectionId: 'section-1',
      size: 12,
    } as FGNode;
    expect(collisionForce.radius()(sectionMember)).toBe(0);
    expect(forceXInstance.strength()(sectionMember)).toBe(0);
    expect(forceYInstance.strength()(sectionMember)).toBe(0);
    expect(forceXInstance.strength()({ id: 'src/root.ts', size: 12 } as FGNode)).toBe(SETTINGS.centerForce);
  });

  it('keeps actively dragged root nodes out of native circular collision while expanded Sections are obstacles', () => {
    const { d3Force, instance } = createPhysicsInstance();

    initPhysics(instance, SETTINGS, { graphLayout: GRAPH_LAYOUT, graphMode: '2d' });
    const collisionForce = getInstalledD3Force<{
      radius: () => (node: FGNode) => number;
    }>(d3Force, 'collision');
    expect(collisionForce.radius()({
      id: 'src/dragged.ts',
      isDragging: true,
      size: 24,
    } as FGNode)).toBe(0);
    expect(collisionForce.radius()({
      id: 'src/passive.ts',
      size: 24,
    } as FGNode)).toBe(28);
  });


});
