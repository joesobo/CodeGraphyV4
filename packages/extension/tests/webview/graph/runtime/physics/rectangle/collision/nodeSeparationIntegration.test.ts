import { describe, expect, it } from 'vitest';
import {
  SETTINGS,
  COLLISION_ASSERTION_EPSILON,
  GRAPH_LAYOUT,
  createGraphSectionBoundsForce,
  runSectionBoundsTicks,
  circleOverlapsSection,
  type FGNode,
} from '../../testSupport';

describe('physics/rectangle node separation integration', () => {
  it('moves expanded Graph Sections and normal nodes apart through d3 velocity integration', () => {
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
    runSectionBoundsTicks(nodes, force, 80);
    expect(circleOverlapsSection(nodes[1], nodes[0])).toBe(false);
    expect(nodes[0].x).toBeLessThan(100);
    expect(nodes[1].x).toBeGreaterThan(190);
    expect(Math.abs(nodes[0].vx ?? 0)).toBeLessThanOrEqual(3);
    expect(Math.abs(nodes[1].vx ?? 0)).toBeLessThanOrEqual(3);
    });

  it('separates circle and expanded section collisions without adding rebound velocity', () => {
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
          vx: 0,
          vy: 0,
          x: 100,
          y: 70,
        },
        {
          id: 'src/loose.ts',
          size: 10,
          vx: -10,
          vy: 0,
          x: 190,
          y: 70,
        },
      ] as FGNode[];
    runSectionBoundsTicks(nodes, force, 80);
    expect(circleOverlapsSection(nodes[1], nodes[0])).toBe(false);
    expect((nodes[1].vx ?? 0) - (nodes[0].vx ?? 0)).toBeGreaterThanOrEqual(0);
    expect(nodes[1].vx ?? 0).toBeLessThanOrEqual(COLLISION_ASSERTION_EPSILON);
    expect(nodes[0].vx ?? 0).toBeLessThanOrEqual(COLLISION_ASSERTION_EPSILON);
    });

  it('separates normal nodes from expanded Graph Section rectangles during collision ticks', () => {
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
    runSectionBoundsTicks(nodes, force, 80);
    expect(circleOverlapsSection(nodes[1], nodes[0])).toBe(false);
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
});
