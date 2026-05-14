import { describe, expect, it } from 'vitest';
import {
  SETTINGS,
  GRAPH_LAYOUT,
  createGraphSectionBoundsForce,
  type FGNode,
} from '../testSupport';

describe('physics/section member repel and links', () => {
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
});
