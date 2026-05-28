import { describe, expect, it } from 'vitest';
import {
  createForceEdges,
  createForceNodes,
  createVisibleEdgeSegment,
  forceNodeCollisionRadius,
  getForceLinkDistance,
  getSafeLinkDistance,
  limitForceNodeVelocity,
  readForceSectionRects,
  separateOverlappingForceNodes,
  type ForceEdge,
  type ForceNode,
} from './model';
import { defaultForceNodeSettings, normalizeForceSettings } from './settings';

function seededRandom(seed: number): () => number {
  let value = seed;

  return () => {
    value = (value * 16807) % 2147483647;

    return (value - 1) / 2147483646;
  };
}

function endpointId(endpoint: ForceEdge['source']): number {
  return typeof endpoint === 'object' ? endpoint.id : Number(endpoint);
}

function connectedNodeIds(nodes: ForceNode[], edges: ForceEdge[]): Set<number> {
  const adjacency = new Map<number, number[]>();

  nodes.forEach(node => {
    adjacency.set(node.id, []);
  });

  edges.forEach(edge => {
    const source = endpointId(edge.source);
    const target = endpointId(edge.target);

    adjacency.get(source)?.push(target);
    adjacency.get(target)?.push(source);
  });

  const visited = new Set<number>();
  const pending = [nodes[0]?.id].filter(id => id !== undefined);

  while (pending.length > 0) {
    const id = pending.pop();

    if (id === undefined || visited.has(id)) {
      continue;
    }

    visited.add(id);
    pending.push(...(adjacency.get(id) ?? []));
  }

  return visited;
}

function stubRect(element: Element, rect: Partial<DOMRect>): void {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      toJSON: () => ({}),
      top: 0,
      width: 0,
      x: 0,
      y: 0,
      ...rect,
    }),
  });
}

function forceNode(overrides: Partial<ForceNode>): ForceNode {
  return {
    clusterId: 0,
    fill: 'hsl(207 83% 48%)',
    id: 0,
    opacity: 0.3,
    pull: 0.06,
    radius: 8,
    stroke: 'hsl(210 88% 88% / 0.62)',
    x: 0,
    y: 0,
    ...overrides,
  };
}

describe('force node field model', () => {
  it('creates a varied set of blue force nodes', () => {
    const nodes = createForceNodes({ height: 800, width: 1200 }, seededRandom(10));

    expect(nodes.length).toBeGreaterThanOrEqual(26);
    expect(nodes.length).toBeLessThanOrEqual(34);
    expect(Math.min(...nodes.map(node => node.radius))).toBeGreaterThan(5);
    expect(new Set(nodes.map(node => node.radius)).size).toBeGreaterThan(6);
    expect(new Set(nodes.map(node => node.fill)).size).toBeGreaterThan(4);
    expect(nodes.every(node => /^hsl\((19|20|21)/.test(node.fill))).toBe(true);
  });

  it('randomizes nodes across refreshes while keeping the same blue theme', () => {
    const firstNodes = createForceNodes({ height: 800, width: 1200 }, seededRandom(11));
    const secondNodes = createForceNodes({ height: 800, width: 1200 }, seededRandom(12));

    expect(firstNodes.map(node => [node.radius, node.fill, node.clusterId])).not.toEqual(
      secondNodes.map(node => [node.radius, node.fill, node.clusterId]),
    );
  });

  it('creates one connected clustered graph with link distance and force settings', () => {
    const nodes = createForceNodes({ height: 800, width: 1200 }, seededRandom(20));
    const edges = createForceEdges(nodes, seededRandom(21));

    expect(connectedNodeIds(nodes, edges).size).toBe(nodes.length);
    expect(edges.length).toBeGreaterThan(nodes.length);
    expect(edges.some(edge => edge.distance < 60 && edge.strength > 0.16)).toBe(true);
    expect(edges.some(edge => edge.distance > 60 && edge.strength < 0.1)).toBe(true);
    expect(edges.every(edge => edge.distance > 0 && edge.strength > 0)).toBe(true);
  });

  it('keeps link distance outside the visible node rim for oversized nodes', () => {
    const source = forceNode({ id: 1, radius: 11 });
    const target = forceNode({ id: 2, radius: 10 });
    const collisionSettings = {
      collisionPadding: 27.2,
      sizeMultiplier: 3.9,
    };

    expect(getSafeLinkDistance(38, source, target, collisionSettings)).toBeGreaterThanOrEqual(
      source.radius * collisionSettings.sizeMultiplier + target.radius * collisionSettings.sizeMultiplier + 4,
    );
  });

  it('preserves visible distance-slider movement when oversized nodes need collision safety', () => {
    const source = forceNode({ id: 1, radius: 8 });
    const target = forceNode({ id: 2, radius: 8 });
    const compactDistance = getForceLinkDistance(40, source, target, normalizeForceSettings({
      ...defaultForceNodeSettings,
      distance: 0,
      size: 100,
    }));
    const defaultDistance = getForceLinkDistance(40, source, target, normalizeForceSettings({
      ...defaultForceNodeSettings,
      distance: 50,
      size: 100,
    }));

    expect(compactDistance).toBeLessThan(defaultDistance - 12);
  });

  it('separates oversized nodes that get shoved into each other', () => {
    const firstNode = forceNode({ id: 1, radius: 11, vx: 14, vy: 9, x: 100, y: 100 });
    const secondNode = forceNode({ id: 2, radius: 10, vx: -12, vy: -8, x: 106, y: 101 });
    const collisionSettings = {
      collisionPadding: 27.2,
      sizeMultiplier: 3.9,
    };
    const nodes = [firstNode, secondNode];

    expect(separateOverlappingForceNodes(nodes, collisionSettings)).toBe(true);

    const distance = Math.hypot((secondNode.x ?? 0) - (firstNode.x ?? 0), (secondNode.y ?? 0) - (firstNode.y ?? 0));
    const requiredDistance = forceNodeCollisionRadius(firstNode, collisionSettings)
      + forceNodeCollisionRadius(secondNode, collisionSettings);

    expect(distance).toBeGreaterThanOrEqual(requiredDistance);
    expect(Math.hypot(firstNode.vx ?? 0, firstNode.vy ?? 0)).toBeLessThan(14);
    expect(Math.hypot(secondNode.vx ?? 0, secondNode.vy ?? 0)).toBeLessThan(12);
  });

  it('clamps fast mouse-shove velocity before it can spin the cluster', () => {
    const node = forceNode({ vx: 18, vy: 24 });

    limitForceNodeVelocity(node, 0.6);

    expect(Math.hypot(node.vx ?? 0, node.vy ?? 0)).toBeCloseTo(0.6);
  });

  it('trims visible edge segments to the node rim', () => {
    expect(
      createVisibleEdgeSegment(
        forceNode({ id: 1, radius: 10, x: 0, y: 0 }),
        forceNode({ id: 2, radius: 20, x: 100, y: 0 }),
        { x: 0, y: 0 },
      ),
    ).toEqual({
      x1: 12,
      x2: 78,
      y1: 0,
      y2: 0,
    });
  });

  it('uses the interactive node size when trimming edge segments', () => {
    expect(
      createVisibleEdgeSegment(
        forceNode({ id: 1, radius: 10, x: 0, y: 0 }),
        forceNode({ id: 2, radius: 10, x: 80, y: 0 }),
        { x: 0, y: 0 },
        2,
        1.5,
      ),
    ).toEqual({
      x1: 17,
      x2: 63,
      y1: 0,
      y2: 0,
    });
  });

  it('skips edges when nodes are too close to reveal a clean segment', () => {
    expect(
      createVisibleEdgeSegment(
        forceNode({ id: 1, radius: 12, x: 0, y: 0 }),
        forceNode({ id: 2, radius: 12, x: 20, y: 0 }),
        { x: 0, y: 0 },
      ),
    ).toBeNull();
  });

  it('uses only visible graph background sections for the mask', () => {
    document.body.innerHTML = `
      <section data-force-field-section="true" id="visible"></section>
      <section data-force-field-section="true" id="below"></section>
      <section id="solid"></section>
    `;

    const visible = document.querySelector('#visible');
    const below = document.querySelector('#below');
    const solid = document.querySelector('#solid');

    if (visible === null || below === null || solid === null) {
      throw new Error('test sections were not created');
    }

    stubRect(visible, { bottom: 340, height: 320, left: 0, top: 20, width: 1200 });
    stubRect(below, { bottom: 980, height: 280, left: 0, top: 700, width: 1200 });
    stubRect(solid, { bottom: 420, height: 320, left: 0, top: 100, width: 1200 });

    expect(readForceSectionRects({ height: 600, width: 1200 })).toEqual([
      {
        height: 320,
        width: 1200,
        x: 0,
        y: 20,
      },
    ]);
  });
});
