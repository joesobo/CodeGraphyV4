import { describe, expect, it } from 'vitest';
import {
  GRAPH_LAYOUT,
  createGraphSectionBoundsForce,
  type FGNode,
} from '../testSupport';

describe('physics/section nested bounds', () => {
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
});
