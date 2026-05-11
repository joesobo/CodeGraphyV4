import { describe, expect, it, vi } from 'vitest';
import { forceManyBody, forceSimulation, type Force } from 'd3-force';
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
  collapsedNodes: {},
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

function getInstalledD3Force<T>(
  d3Force: ReturnType<typeof createPhysicsInstance>['d3Force'],
  name: string,
): T {
  const call = [...d3Force.mock.calls].reverse().find(([forceName, value]) => forceName === name && value !== undefined);
  expect(call).toBeDefined();
  return call?.[1] as T;
}

interface SectionRect {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

type D3PhysicsForce = Force<FGNode, undefined>;

function createPackingGraphLayout(sectionCount: number): GraphLayoutSettings {
  const sections: GraphLayoutSettings['sections'] = {};
  const ownership: GraphLayoutSettings['ownership'] = {};

  for (let index = 0; index < sectionCount; index += 1) {
    const sectionId = `section-${index + 1}`;
    sections[sectionId] = {
      id: sectionId,
      label: sectionId,
      color: '#60a5fa',
      x: 0,
      y: 0,
      width: 120,
      height: 100,
      collapsed: false,
      updatedAt: '2026-05-08T09:00:00.000Z',
    };
    ownership[sectionId] = {
      itemId: sectionId,
      itemKind: 'section',
      ownerSectionId: null,
      updatedAt: '2026-05-08T09:00:00.000Z',
    };

    for (let memberIndex = 0; memberIndex < 3; memberIndex += 1) {
      const memberId = `${sectionId}/member-${memberIndex}.ts`;
      ownership[memberId] = {
        itemId: memberId,
        itemKind: 'node',
        ownerSectionId: sectionId,
        updatedAt: '2026-05-08T09:00:00.000Z',
      };
    }
  }

  return { collapsedNodes: {}, pinnedNodes: {}, sections, ownership };
}

function createPackingNodes(): FGNode[] {
  const origins = [
    { x: -420, y: -320 },
    { x: 420, y: -320 },
    { x: -420, y: 320 },
    { x: 420, y: 320 },
  ];
  const nodes: FGNode[] = [];

  for (const [index, origin] of origins.entries()) {
    const sectionId = `section-${index + 1}`;
    nodes.push({
      id: sectionId,
      isGraphSection: true,
      sectionHeight: 100,
      sectionWidth: 120,
      size: 50,
      vx: 0,
      vy: 0,
      x: origin.x,
      y: origin.y,
    } as FGNode);

    for (let memberIndex = 0; memberIndex < 3; memberIndex += 1) {
      nodes.push({
        id: `${sectionId}/member-${memberIndex}.ts`,
        ownerSectionId: sectionId,
        size: 12,
        vx: 0,
        vy: 0,
        x: origin.x + (memberIndex - 1) * 24,
        y: origin.y + 16,
      } as FGNode);
    }
  }

  return nodes;
}

const VARIED_SECTION_SIZES = [
  { width: 225, height: 205, members: 11 },
  { width: 200, height: 196, members: 9 },
  { width: 249, height: 275, members: 19 },
  { width: 127, height: 98, members: 4 },
  { width: 215, height: 178, members: 6 },
  { width: 241, height: 274, members: 6 },
  { width: 174, height: 171, members: 4 },
  { width: 262, height: 184, members: 13 },
  { width: 132, height: 116, members: 4 },
  { width: 158, height: 153, members: 5 },
  { width: 155, height: 259, members: 5 },
  { width: 268, height: 219, members: 3 },
  { width: 212, height: 128, members: 5 },
  { width: 175, height: 192, members: 5 },
  { width: 241, height: 179, members: 8 },
  { width: 135, height: 184, members: 3 },
  { width: 638, height: 494, members: 3 },
] as const;

function createVariedPackingGraphLayout(): GraphLayoutSettings {
  const sections: GraphLayoutSettings['sections'] = {};
  const ownership: GraphLayoutSettings['ownership'] = {};

  for (const [index, sectionSize] of VARIED_SECTION_SIZES.entries()) {
    const sectionId = `section-${index + 1}`;
    sections[sectionId] = {
      id: sectionId,
      label: sectionId,
      color: '#60a5fa',
      x: 0,
      y: 0,
      width: sectionSize.width,
      height: sectionSize.height,
      collapsed: false,
      updatedAt: '2026-05-08T09:00:00.000Z',
    };
    ownership[sectionId] = {
      itemId: sectionId,
      itemKind: 'section',
      ownerSectionId: null,
      updatedAt: '2026-05-08T09:00:00.000Z',
    };

    for (let memberIndex = 0; memberIndex < sectionSize.members; memberIndex += 1) {
      ownership[`section-${index + 1}/member-${memberIndex}.ts`] = {
        itemId: `section-${index + 1}/member-${memberIndex}.ts`,
        itemKind: 'node',
        ownerSectionId: sectionId,
        updatedAt: '2026-05-08T09:00:00.000Z',
      };
    }
  }

  return { collapsedNodes: {}, pinnedNodes: {}, sections, ownership };
}

function createVariedPackingNodes(): FGNode[] {
  const nodes: FGNode[] = [];

  for (const [index, sectionSize] of VARIED_SECTION_SIZES.entries()) {
    const sectionId = `section-${index + 1}`;
    const angle = (index / VARIED_SECTION_SIZES.length) * Math.PI * 2;
    const distance = 900 + (index % 5) * 120;
    const origin = {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
    };

    nodes.push({
      id: sectionId,
      isGraphSection: true,
      sectionHeight: sectionSize.height,
      sectionWidth: sectionSize.width,
      size: Math.max(sectionSize.width, sectionSize.height) / 2,
      vx: 0,
      vy: 0,
      x: origin.x,
      y: origin.y,
    } as FGNode);

    for (let memberIndex = 0; memberIndex < sectionSize.members; memberIndex += 1) {
      nodes.push({
        id: `${sectionId}/member-${memberIndex}.ts`,
        ownerSectionId: sectionId,
        size: 8 + (memberIndex % 4) * 4,
        vx: 0,
        vy: 0,
        x: origin.x + ((memberIndex % 4) - 1.5) * 28,
        y: origin.y + (Math.floor(memberIndex / 4) - 1) * 28,
      } as FGNode);
    }
  }

  return nodes;
}

function toSectionRect(node: FGNode): SectionRect {
  const width = node.sectionWidth ?? 0;
  const height = node.sectionHeight ?? 0;
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  return {
    bottom: y + (height / 2),
    left: x - (width / 2),
    right: x + (width / 2),
    top: y - (height / 2),
  };
}

function getRectGap(left: SectionRect, right: SectionRect): number {
  const xGap = Math.max(0, Math.max(left.left, right.left) - Math.min(left.right, right.right));
  const yGap = Math.max(0, Math.max(left.top, right.top) - Math.min(left.bottom, right.bottom));
  return Math.hypot(xGap, yGap);
}

function hasRectOverlap(left: SectionRect, right: SectionRect): boolean {
  return Math.min(left.right, right.right) - Math.max(left.left, right.left) > 0.5
    && Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top) > 0.5;
}

function getLargestNearestSectionGap(nodes: readonly FGNode[]): number {
  const rects = nodes.filter(node => node.isGraphSection).map(toSectionRect);
  return Math.max(...rects.map((rect, index) => Math.min(
    ...rects
      .filter((_, otherIndex) => otherIndex !== index)
      .map(otherRect => getRectGap(rect, otherRect)),
  )));
}

function getSmallestSectionGap(nodes: readonly FGNode[]): number {
  const rects = nodes.filter(node => node.isGraphSection).map(toSectionRect);
  let smallestGap = Number.POSITIVE_INFINITY;
  for (let leftIndex = 0; leftIndex < rects.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < rects.length; rightIndex += 1) {
      smallestGap = Math.min(smallestGap, getRectGap(rects[leftIndex], rects[rightIndex]));
    }
  }

  return smallestGap;
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

function createD3PhysicsInstance() {
  const forces: Record<string, D3PhysicsForce | undefined> = {
    charge: forceManyBody<FGNode>(),
  };
  const d3Force = vi.fn((name: string, value?: unknown) => {
    if (value !== undefined) {
      forces[name] = value as D3PhysicsForce;
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

function getRequiredD3PhysicsForce(
  forces: Record<string, D3PhysicsForce | undefined>,
  name: string,
): D3PhysicsForce {
  const force = forces[name];
  expect(force).toBeDefined();
  return force as D3PhysicsForce;
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

  it('packs expanded Graph Sections together at the root center when repel is disabled', () => {
    const graphLayout = createPackingGraphLayout(4);
    const nodes = createPackingNodes();
    const { d3Force, instance } = createPhysicsInstance();
    const settings = {
      ...SETTINGS,
      centerForce: 1,
      repelForce: 0,
    };

    initPhysics(instance, settings, { graphLayout, graphMode: '2d' });

    const simulation = forceSimulation(nodes)
      .velocityDecay(settings.damping)
      .force('forceX', getInstalledD3Force(d3Force, 'forceX'))
      .force('forceY', getInstalledD3Force(d3Force, 'forceY'))
      .force('collision', getInstalledD3Force(d3Force, 'collision'))
      .force('sectionBounds', getInstalledD3Force(d3Force, 'sectionBounds'))
      .stop();

    for (let tick = 0; tick < 600; tick += 1) {
      simulation.tick();
    }

    const sectionRects = nodes.filter(node => node.isGraphSection).map(toSectionRect);
    for (let leftIndex = 0; leftIndex < sectionRects.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < sectionRects.length; rightIndex += 1) {
        expect(hasRectOverlap(sectionRects[leftIndex], sectionRects[rightIndex])).toBe(false);
      }
    }
    expect(getLargestNearestSectionGap(nodes)).toBeLessThanOrEqual(1.5);
  });

  it('packs many varied expanded Graph Sections together at the root center when repel is disabled', () => {
    const graphLayout = createVariedPackingGraphLayout();
    const nodes = createVariedPackingNodes();
    const { d3Force, instance } = createPhysicsInstance();
    const settings = {
      ...SETTINGS,
      centerForce: 1,
      linkForce: 0,
      repelForce: 0,
    };

    initPhysics(instance, settings, { graphLayout, graphMode: '2d' });

    const simulation = forceSimulation(nodes)
      .velocityDecay(settings.damping)
      .force('forceX', getInstalledD3Force(d3Force, 'forceX'))
      .force('forceY', getInstalledD3Force(d3Force, 'forceY'))
      .force('collision', getInstalledD3Force(d3Force, 'collision'))
      .force('sectionBounds', getInstalledD3Force(d3Force, 'sectionBounds'))
      .stop();

    for (let tick = 0; tick < 1_000; tick += 1) {
      simulation.tick();
    }

    const sectionRects = nodes.filter(node => node.isGraphSection).map(toSectionRect);
    for (let leftIndex = 0; leftIndex < sectionRects.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < sectionRects.length; rightIndex += 1) {
        expect(hasRectOverlap(sectionRects[leftIndex], sectionRects[rightIndex])).toBe(false);
      }
    }
    expect(getLargestNearestSectionGap(nodes)).toBeLessThanOrEqual(2);
  }, 20_000);

  it('keeps max-repel expanded Graph Sections visibly separated instead of edge-pressed', () => {
    const graphLayout = createPackingGraphLayout(4);
    const nodes = createPackingNodes();
    const { d3Force, instance } = createPhysicsInstance();
    const settings = {
      ...SETTINGS,
      centerForce: 0.1,
      linkForce: 0,
      repelForce: 20,
    };

    initPhysics(instance, settings, { graphLayout, graphMode: '2d' });

    const simulation = forceSimulation(nodes)
      .velocityDecay(settings.damping)
      .force('forceX', getInstalledD3Force(d3Force, 'forceX'))
      .force('forceY', getInstalledD3Force(d3Force, 'forceY'))
      .force('collision', getInstalledD3Force(d3Force, 'collision'))
      .force('sectionBounds', getInstalledD3Force(d3Force, 'sectionBounds'))
      .stop();

    for (let tick = 0; tick < 800; tick += 1) {
      simulation.tick();
    }

    expect(getSmallestSectionGap(nodes)).toBeGreaterThanOrEqual(16);
  });

  it('scales max-repel spacing for varied expanded Graph Sections so center force does not edge-pack them', () => {
    const graphLayout = createVariedPackingGraphLayout();
    const nodes = createVariedPackingNodes();
    const { forces, instance } = createD3PhysicsInstance();
    const settings = {
      ...SETTINGS,
      centerForce: 0.1,
      linkForce: 0,
      repelForce: 20,
    };

    initPhysics(instance, settings, { graphLayout, graphMode: '2d' });

    const simulation = forceSimulation(nodes)
      .velocityDecay(settings.damping)
      .force('charge', getRequiredD3PhysicsForce(forces, 'charge'))
      .force('forceX', getRequiredD3PhysicsForce(forces, 'forceX'))
      .force('forceY', getRequiredD3PhysicsForce(forces, 'forceY'))
      .force('collision', getRequiredD3PhysicsForce(forces, 'collision'))
      .force('sectionBounds', getRequiredD3PhysicsForce(forces, 'sectionBounds'))
      .stop();

    for (let tick = 0; tick < 1_500; tick += 1) {
      simulation.tick();
    }

    expect(getSmallestSectionGap(nodes)).toBeGreaterThanOrEqual(48);
  }, 20_000);

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

  it('uses the configured center force for local Section Member physics', () => {
    const force = createGraphSectionBoundsForce(GRAPH_LAYOUT, {
      settings: {
        ...SETTINGS,
        centerForce: 0,
        linkForce: 0,
        repelForce: 0,
      },
    });
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
        x: 70,
        y: 80,
      },
    ] as FGNode[];

    force.initialize(nodes);
    force(0.5);

    expect(nodes[1]).toMatchObject({
      vx: 0,
      vy: 0,
      x: 70,
      y: 80,
    });
  });

  it('centers Section Members on the owning Section Node bounds while keeping them out of the header', () => {
    const force = createGraphSectionBoundsForce({
      ...GRAPH_LAYOUT,
      sections: {
        'section-1': {
          ...GRAPH_LAYOUT.sections['section-1'],
          height: 200,
          width: 200,
        },
      },
    }, {
      settings: {
        ...SETTINGS,
        centerForce: 1,
        linkForce: 0,
        repelForce: 0,
      },
    });
    const nodes = [
      {
        id: 'section-1',
        isGraphSection: true,
        sectionHeight: 200,
        sectionWidth: 200,
        x: 100,
        y: 100,
      },
      {
        id: 'src/member.ts',
        ownerSectionId: 'section-1',
        size: 10,
        vx: 0,
        vy: 0,
        x: 70,
        y: 105,
      },
    ] as FGNode[];

    force.initialize(nodes);
    force(0.5);

    expect(nodes[1].vx).toBeGreaterThan(0);
    expect(nodes[1].vy).toBeLessThan(0);
  });

  it('cancels leaked root-origin center pull for Section Members before local centering', () => {
    const force = createGraphSectionBoundsForce({
      ...GRAPH_LAYOUT,
      sections: {
        'section-1': {
          ...GRAPH_LAYOUT.sections['section-1'],
          x: 900,
          y: -300,
          height: 200,
          width: 200,
        },
      },
    }, {
      settings: {
        ...SETTINGS,
        centerForce: 1,
        linkForce: 0,
        repelForce: 0,
      },
    });
    const nodes = [
      {
        id: 'section-1',
        isGraphSection: true,
        sectionHeight: 200,
        sectionWidth: 200,
        x: 1000,
        y: -200,
      },
      {
        id: 'src/member.ts',
        ownerSectionId: 'section-1',
        size: 10,
        vx: -975,
        vy: 225,
        x: 975,
        y: -225,
      },
    ] as FGNode[];

    force.initialize(nodes);
    force(1);

    expect(nodes[1].vx).toBeGreaterThan(0);
    expect(nodes[1].vy).toBeGreaterThan(0);
  });

  it('uses the configured repel force for local Section Member physics', () => {
    const force = createGraphSectionBoundsForce(GRAPH_LAYOUT, {
      settings: {
        ...SETTINGS,
        centerForce: 0,
        linkForce: 0,
        repelForce: 20,
      },
    });
    const nodes = [
      {
        id: 'section-1',
        isGraphSection: true,
        sectionHeight: 200,
        sectionWidth: 260,
        x: 130,
        y: 100,
      },
      {
        id: 'src/member.ts',
        ownerSectionId: 'section-1',
        size: 8,
        vx: 0,
        vy: 0,
        x: 110,
        y: 120,
      },
      {
        id: 'src/peer.ts',
        ownerSectionId: 'section-1',
        size: 8,
        vx: 0,
        vy: 0,
        x: 150,
        y: 120,
      },
    ] as FGNode[];

    force.initialize(nodes);
    force(0.5);

    expect(nodes[1].vx).toBeLessThan(0);
    expect(nodes[2].vx).toBeGreaterThan(0);
    expect(nodes[1].vy).toBe(0);
    expect(nodes[2].vy).toBe(0);
  });

  it('applies bridge link pressure between root nodes and expanded Section Members', () => {
    const force = createGraphSectionBoundsForce(GRAPH_LAYOUT, {
      links: [
        {
          id: 'root-to-member',
          source: 'src/root.ts',
          target: 'src/member.ts',
        } as never,
      ],
      settings: {
        ...SETTINGS,
        linkDistance: 100,
        linkForce: 1,
      },
    });
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
        id: 'src/root.ts',
        size: 10,
        vx: 0,
        vy: 0,
        x: 500,
        y: 70,
      },
      {
        id: 'src/member.ts',
        ownerSectionId: 'section-1',
        size: 10,
        vx: 0,
        vy: 0,
        x: 120,
        y: 70,
      },
    ] as FGNode[];

    force.initialize(nodes);
    force(0.5);

    expect(nodes[1].vx).toBeLessThan(0);
    expect(nodes[2].vx).toBeGreaterThan(0);
  });

  it('applies configured link distance and force between members inside the same Section Node', () => {
    const force = createGraphSectionBoundsForce({
      ...GRAPH_LAYOUT,
      ownership: {
        ...GRAPH_LAYOUT.ownership,
        'src/peer.ts': {
          itemId: 'src/peer.ts',
          itemKind: 'node',
          ownerSectionId: 'section-1',
          updatedAt: '2026-05-07T09:00:00.000Z',
        },
      },
    }, {
      links: [
        {
          id: 'member-to-peer',
          source: 'src/member.ts',
          target: 'src/peer.ts',
        } as never,
      ],
      settings: {
        ...SETTINGS,
        centerForce: 0,
        linkDistance: 100,
        linkForce: 1,
        repelForce: 0,
      },
    });
    const nodes = [
      {
        id: 'section-1',
        isGraphSection: true,
        sectionHeight: 200,
        sectionWidth: 240,
        x: 120,
        y: 100,
      },
      {
        id: 'src/member.ts',
        ownerSectionId: 'section-1',
        size: 10,
        vx: 0,
        vy: 0,
        x: 100,
        y: 100,
      },
      {
        id: 'src/peer.ts',
        ownerSectionId: 'section-1',
        size: 10,
        vx: 0,
        vy: 0,
        x: 140,
        y: 100,
      },
    ] as FGNode[];

    force.initialize(nodes);
    force(0.5);

    expect(nodes[1].vx).toBeLessThan(0);
    expect(nodes[2].vx).toBeGreaterThan(0);
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

  it('moves normal nodes out of expanded Graph Section rectangles during collision ticks', () => {
    const force = createGraphSectionBoundsForce(GRAPH_LAYOUT, {
      settings: {
        ...SETTINGS,
        centerForce: 0,
        repelForce: 20,
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
        id: 'src/loose.ts',
        size: 10,
        vx: 0,
        vy: 0,
        x: 190,
        y: 70,
      },
    ] as FGNode[];

    force.initialize(nodes);
    force(1);

    expect(nodes[1].x).toBeGreaterThanOrEqual(218);
  });

  it('does not collide normal nodes with a Section Frame when only the circle bounding box touches a corner', () => {
    const force = createGraphSectionBoundsForce({
      ...GRAPH_LAYOUT,
      sections: {
        'section-1': {
          ...GRAPH_LAYOUT.sections['section-1'],
          height: 100,
          width: 100,
        },
      },
    });
    const nodes = [
      {
        id: 'section-1',
        isGraphSection: true,
        sectionHeight: 100,
        sectionWidth: 100,
        vx: 0,
        vy: 0,
        x: 50,
        y: 50,
      },
      {
        id: 'src/near-corner.ts',
        size: 8,
        vx: 0,
        vy: 0,
        x: 110,
        y: -10,
      },
    ] as FGNode[];

    force.initialize(nodes);
    force(0.5);

    expect(nodes[0]).toMatchObject({ vx: 0, vy: 0 });
    expect(nodes[1]).toMatchObject({ vx: 0, vy: 0 });
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

  it('applies local section physics to nested Graph Section Nodes without moving the owner frame', () => {
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
    expect(nodes[1].x).toBeGreaterThanOrEqual(56);
    expect(nodes[1].x).toBeLessThanOrEqual(144);
    expect(nodes[1].y).toBeGreaterThanOrEqual(70);
    expect(nodes[1].y).toBeLessThanOrEqual(94);
    expect(nodes[1].vx).toBeGreaterThan(0);
  });

  it('keeps nested Graph Section Nodes inside their owner Section Frame body', () => {
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
          height: 60,
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
        x: 100,
        y: 70,
      },
      {
        id: 'section-2',
        isGraphSection: true,
        sectionHeight: 60,
        sectionWidth: 80,
        vx: 0,
        vy: 0,
        x: 260,
        y: 200,
      },
    ] as FGNode[];

    force.initialize(nodes);
    force(0.5);

    expect(nodes[1].x).toBeLessThanOrEqual(144);
    expect(nodes[1].y).toBeLessThanOrEqual(94);
    expect(nodes[1].vx).toBeLessThan(0);
    expect(nodes[1].vy).toBeLessThan(0);
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
