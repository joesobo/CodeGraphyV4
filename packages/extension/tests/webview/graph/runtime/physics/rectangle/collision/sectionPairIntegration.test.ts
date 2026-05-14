import { describe, expect, it } from 'vitest';
import {
  SETTINGS,
  COLLISION_ASSERTION_EPSILON,
  GRAPH_LAYOUT,
  createGraphSectionBoundsForce,
  runSectionBoundsTicks,
  type FGNode,
} from '../../testSupport';

describe('physics/rectangle section pair integration', () => {
  it('applies separating velocity to overlapping expanded Graph Section rectangles by their actual bounds', () => {
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
    expect(nodes[0]).toMatchObject({ x: 100, y: 70 });
    expect(nodes[1]).toMatchObject({ x: 180, y: 70 });
    expect(nodes[0].vx).toBeLessThan(0);
    expect(nodes[1].vx).toBeGreaterThan(0);
    expect(nodes[0].vy).toBe(0);
    expect(nodes[1].vy).toBe(0);
    });

  it('resolves overlapping expanded Graph Section rectangle positions through d3 velocity integration', () => {
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
    runSectionBoundsTicks(nodes, force, 80);
    const sectionOneRight = nodes[0].x! + 100;
    const sectionTwoLeft = nodes[1].x! - 100;
    expect(sectionOneRight).toBeLessThanOrEqual(sectionTwoLeft + COLLISION_ASSERTION_EPSILON);
    });

  it('keeps expanded Section rectangle collision position updates inside d3 velocity integration', () => {
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
          vx: 0,
          vy: 0,
          x: 190,
          y: 70,
        },
      ] as FGNode[];
    force.initialize(nodes);
    force(1);
    expect(nodes[0]).toMatchObject({ x: 100, y: 70 });
    expect(nodes[1]).toMatchObject({ x: 190, y: 70 });
    expect(nodes[0].vx).toBeLessThan(0);
    expect(nodes[1].vx).toBeGreaterThan(0);
    });
});
