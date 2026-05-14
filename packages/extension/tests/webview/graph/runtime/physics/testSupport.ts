import { expect, vi } from 'vitest';
import { forceManyBody, forceSimulation, type Force } from 'd3-force';
import type { IPhysicsSettings } from '../../../../../src/shared/settings/physics';
import {
  applyPhysicsSettings,
  createGraphSectionBoundsForce,
  getGraphCollisionRadius,
  havePhysicsSettingsChanged,
  initPhysics,
} from '../../../../../src/webview/components/graph/runtime/physics';
import type { FGNode } from '../../../../../src/webview/components/graph/model/build';
import type { GraphLayoutSettings } from '../../../../../src/shared/settings/graphLayout';

export { forceManyBody, forceSimulation };
export {
  applyPhysicsSettings,
  createGraphSectionBoundsForce,
  getGraphCollisionRadius,
  havePhysicsSettingsChanged,
  initPhysics,
};
export type { FGNode, GraphLayoutSettings, IPhysicsSettings, Force };

export const SETTINGS: IPhysicsSettings = {
  centerForce: 0.12,
  damping: 0.7,
  linkDistance: 140,
  linkForce: 0.33,
  repelForce: 620,
};
export const COLLISION_ASSERTION_EPSILON = 0.5;

export const GRAPH_LAYOUT: GraphLayoutSettings = {
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

export interface SectionRect {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

export type D3PhysicsForce = Force<FGNode, undefined>;

export function createPackingGraphLayout(sectionCount: number): GraphLayoutSettings {
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

export function createPackingNodes(): FGNode[] {
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

export interface PackingSectionSize {
  height: number;
  members: number;
  width: number;
}

export const VARIED_SECTION_SIZES = [
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

export const REPRESENTATIVE_REPEL_SECTION_SIZES = [
  { width: 225, height: 205, members: 4 },
  { width: 127, height: 98, members: 2 },
  { width: 268, height: 219, members: 3 },
  { width: 155, height: 259, members: 3 },
  { width: 638, height: 494, members: 3 },
] as const;

export function createVariedPackingGraphLayout(
  sectionSizes: readonly PackingSectionSize[] = VARIED_SECTION_SIZES,
): GraphLayoutSettings {
  const sections: GraphLayoutSettings['sections'] = {};
  const ownership: GraphLayoutSettings['ownership'] = {};

  for (const [index, sectionSize] of sectionSizes.entries()) {
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

export function createVariedPackingNodes(
  sectionSizes: readonly PackingSectionSize[] = VARIED_SECTION_SIZES,
): FGNode[] {
  const nodes: FGNode[] = [];

  for (const [index, sectionSize] of sectionSizes.entries()) {
    const sectionId = `section-${index + 1}`;
    const angle = (index / sectionSizes.length) * Math.PI * 2;
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

export function toSectionRect(node: FGNode): SectionRect {
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

export function getRectGap(left: SectionRect, right: SectionRect): number {
  const xGap = Math.max(0, Math.max(left.left, right.left) - Math.min(left.right, right.right));
  const yGap = Math.max(0, Math.max(left.top, right.top) - Math.min(left.bottom, right.bottom));
  return Math.hypot(xGap, yGap);
}

export function hasRectOverlap(left: SectionRect, right: SectionRect): boolean {
  return Math.min(left.right, right.right) - Math.max(left.left, right.left) > 0.5
    && Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top) > 0.5;
}

export function circleOverlapsSection(circle: FGNode, section: FGNode): boolean {
  const rect = toSectionRect(section);
  const radius = (circle.size ?? 0) + 4;
  const x = circle.x ?? 0;
  const y = circle.y ?? 0;
  const closestX = Math.max(rect.left, Math.min(rect.right, x));
  const closestY = Math.max(rect.top, Math.min(rect.bottom, y));
  const deltaX = x - closestX;
  const deltaY = y - closestY;
  const visibleRadius = Math.max(0, radius - COLLISION_ASSERTION_EPSILON);
  return deltaX * deltaX + deltaY * deltaY < visibleRadius * visibleRadius;
}

export function getLargestNearestSectionGap(nodes: readonly FGNode[]): number {
  const rects = nodes.filter(node => node.isGraphSection).map(toSectionRect);
  return Math.max(...rects.map((rect, index) => Math.min(
    ...rects
      .filter((_, otherIndex) => otherIndex !== index)
      .map(otherRect => getRectGap(rect, otherRect)),
  )));
}

export function getSmallestSectionGap(nodes: readonly FGNode[]): number {
  const rects = nodes.filter(node => node.isGraphSection).map(toSectionRect);
  let smallestGap = Number.POSITIVE_INFINITY;
  for (let leftIndex = 0; leftIndex < rects.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < rects.length; rightIndex += 1) {
      smallestGap = Math.min(smallestGap, getRectGap(rects[leftIndex], rects[rightIndex]));
    }
  }

  return smallestGap;
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

export function runSectionBoundsTicks(
  nodes: FGNode[],
  force: ReturnType<typeof createGraphSectionBoundsForce>,
  ticks: number,
  damping = SETTINGS.damping,
): void {
  const simulation = forceSimulation(nodes)
    .velocityDecay(damping)
    .force('sectionBounds', force as D3PhysicsForce)
    .stop();

  for (let tick = 0; tick < ticks; tick += 1) {
    simulation.tick();
  }
}

export function getRequiredD3PhysicsForce(
  forces: Record<string, D3PhysicsForce | undefined>,
  name: string,
): D3PhysicsForce {
  const force = forces[name];
  expect(force).toBeDefined();
  return force as D3PhysicsForce;
}

export function runRootSectionSimulation(
  nodes: FGNode[],
  graphLayout: GraphLayoutSettings,
  settings: IPhysicsSettings,
  ticks: number,
): void {
  const { forces, instance } = createD3PhysicsInstance();

  initPhysics(instance, settings, { graphLayout, graphMode: '2d' });

  const simulation = forceSimulation(nodes)
    .velocityDecay(settings.damping)
    .force('charge', getRequiredD3PhysicsForce(forces, 'charge'))
    .force('forceX', getRequiredD3PhysicsForce(forces, 'forceX'))
    .force('forceY', getRequiredD3PhysicsForce(forces, 'forceY'))
    .force('collision', getRequiredD3PhysicsForce(forces, 'collision'))
    .force('sectionBounds', getRequiredD3PhysicsForce(forces, 'sectionBounds'))
    .stop();

  for (let tick = 0; tick < ticks; tick += 1) {
    simulation.tick();
  }
}
