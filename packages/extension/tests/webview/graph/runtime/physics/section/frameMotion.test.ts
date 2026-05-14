import { describe, expect, it } from 'vitest';
import {
  GRAPH_LAYOUT,
  createGraphSectionBoundsForce,
  type FGNode,
} from '../testSupport';

describe('physics/section frame motion', () => {
  it('does not let owned members accelerate their expanded Graph Section frame', () => {
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
          id: 'src/member.ts',
          ownerSectionId: 'section-1',
          size: 10,
          vx: 0,
          vy: 0,
          x: 400,
          y: 400,
        },
      ] as FGNode[];
    force.initialize(nodes);
    force(0.5);
    expect(nodes[0].vx).toBe(0);
    expect(nodes[0].vy).toBe(0);
    });

  it('carries Section Members with their expanded Graph Section frame between ticks', () => {
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
          id: 'src/member.ts',
          ownerSectionId: 'section-1',
          size: 10,
          vx: 0,
          vy: 0,
          x: 120,
          y: 110,
        },
      ] as FGNode[];
    force.initialize(nodes);
    force(0.5);
    nodes[0].x = 140;
    nodes[0].y = 100;
    force(0.5);
    expect(nodes[1].x).toBe(160);
    expect(nodes[1].y).toBe(140);
    });
});
