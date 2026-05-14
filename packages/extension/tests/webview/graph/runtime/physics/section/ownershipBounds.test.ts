import { describe, expect, it } from 'vitest';
import {
  SETTINGS,
  GRAPH_LAYOUT,
  createGraphSectionBoundsForce,
  runSectionBoundsTicks,
  circleOverlapsSection,
  type FGNode,
} from '../testSupport';

describe('physics/section ownership bounds', () => {
  it('moves nodes without section ownership out of expanded section bounds', () => {
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
          x: 90,
          y: 50,
        },
      ] as FGNode[];
    runSectionBoundsTicks(nodes, force, 80);
    const outside = nodes[1];
    expect(circleOverlapsSection(outside, nodes[0])).toBe(false);
    expect(Math.abs(nodes[0].vx ?? 0)).toBeLessThanOrEqual(3);
    expect(nodes[0].vy ?? 0).toBe(0);
    expect(Math.abs(outside.vx ?? 0)).toBeLessThanOrEqual(3);
    expect(outside.vy ?? 0).toBe(0);
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

  it('respects a live null owner override after a Section Member is dropped into the root graph', () => {
    const force = createGraphSectionBoundsForce(GRAPH_LAYOUT, {
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
    sectionHeight: 140,
    sectionWidth: 200,
          x: 100,
          y: 70,
        },
        {
          id: 'src/member.ts',
          ownerSectionId: null,
          size: 10,
          vx: 0,
          vy: 0,
          x: 260,
          y: 70,
        },
      ] as FGNode[];
    force.initialize(nodes);
    force(1);
    expect(nodes[1]).toMatchObject({
        vx: 0,
        vy: 0,
        x: 260,
        y: 70,
      });
    });
});
