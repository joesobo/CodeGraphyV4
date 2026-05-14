import { describe, expect, it } from 'vitest';
import {
  SETTINGS,
  GRAPH_LAYOUT,
  createGraphSectionBoundsForce,
  type FGNode,
} from '../testSupport';

describe('physics/section bridge links', () => {
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

  it('caps bridge link pressure so cross-boundary links settle smoothly', () => {
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
    expect(Math.abs(nodes[1].vx ?? 0)).toBeLessThanOrEqual(6);
    expect(Math.abs(nodes[2].vx ?? 0)).toBeLessThanOrEqual(6);
    });

  it('pulls an expanded Graph Section frame through a linked member pressed against its edge', () => {
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
          centerForce: 0,
          linkDistance: 80,
          linkForce: 1,
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
          x: 180,
          y: 70,
        },
      ] as FGNode[];
    force.initialize(nodes);
    force(0.5);
    expect(nodes[0].vx).toBeGreaterThan(0);
    expect(nodes[1].vx).toBeLessThan(0);
    expect(nodes[2].vx).toBeGreaterThan(0);
    });
});
