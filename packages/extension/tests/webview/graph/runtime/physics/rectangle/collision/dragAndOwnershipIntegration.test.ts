import { describe, expect, it } from 'vitest';
import {
  SETTINGS,
  GRAPH_LAYOUT,
  createGraphSectionBoundsForce,
  runSectionBoundsTicks,
  type FGNode,
  type GraphLayoutSettings,
} from '../../testSupport';

describe('physics/rectangle drag and ownership integration', () => {
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

  it('caps expanded section velocity while constraining passive root nodes out of the frame', () => {
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
    force(1);
    expect(Math.abs(nodes[0].vx ?? 0)).toBeLessThanOrEqual(3);
    expect(nodes[1].vx).toBeGreaterThan(0);
    });

  it('does not push sections away from a dragged expanded Graph Section', () => {
    const graphLayout: GraphLayoutSettings = {
        collapsedNodes: {},
        pinnedNodes: {},
    sections: {
          parent: {
            id: 'parent',
            label: 'Parent',
            color: '#60a5fa',
            x: 0,
            y: 0,
            width: 200,
            height: 160,
            collapsed: false,
            updatedAt: '2026-05-13T09:30:00.000Z',
          },
          child: {
            id: 'child',
            label: 'Child',
            color: '#22c55e',
            x: 40,
            y: 30,
            width: 120,
            height: 90,
            collapsed: false,
            updatedAt: '2026-05-13T09:30:00.000Z',
          },
        },
        ownership: {
          parent: {
            itemId: 'parent',
            itemKind: 'section',
            ownerSectionId: null,
            updatedAt: '2026-05-13T09:30:00.000Z',
          },
          child: {
            itemId: 'child',
            itemKind: 'section',
            ownerSectionId: null,
            updatedAt: '2026-05-13T09:30:00.000Z',
          },
        },
      };
    const force = createGraphSectionBoundsForce(graphLayout, {
    settings: {
          ...SETTINGS,
          centerForce: 0,
          linkForce: 0,
          repelForce: 0,
        },
      });
    const nodes = [
        {
          id: 'parent',
          isGraphSection: true,
    sectionHeight: 160,
    sectionWidth: 200,
          vx: 0,
          vy: 0,
          x: 100,
          y: 80,
        },
        {
          fx: 100,
          fy: 80,
          id: 'child',
          isDragging: true,
          isGraphSection: true,
    sectionHeight: 90,
    sectionWidth: 120,
          vx: 0,
          vy: 0,
          x: 100,
          y: 80,
        },
      ] as FGNode[];
    runSectionBoundsTicks(nodes, force, 1);
    expect(nodes[0]).toMatchObject({ vx: 0, vy: 0, x: 100, y: 80 });
    expect(nodes[1]).toMatchObject({ vx: 0, vy: 0, x: 100, y: 80 });
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
});
