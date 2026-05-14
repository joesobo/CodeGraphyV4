import { describe, expect, it } from 'vitest';
import {
  GRAPH_LAYOUT,
  createGraphSectionBoundsForce,
  type FGNode,
} from '../testSupport';

describe('physics/section body bounds', () => {
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
});
