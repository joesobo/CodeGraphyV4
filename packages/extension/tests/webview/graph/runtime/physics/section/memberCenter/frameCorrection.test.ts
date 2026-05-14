import { describe, expect, it } from 'vitest';
import {
  SETTINGS,
  GRAPH_LAYOUT,
  createGraphSectionBoundsForce,
  type FGNode,
} from '../../testSupport';

describe('physics/section member center frame correction', () => {
  it('keeps Section Members inside the owner frame with gentle center correction', () => {
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
            size: 16,
            vx: 0,
            vy: 0,
            x: 260,
            y: -40,
          },
        ] as FGNode[];
      force.initialize(nodes);
      force(0.5);
      expect(nodes[1].x).toBeLessThanOrEqual(168);
      expect(nodes[1].y).toBeGreaterThanOrEqual(60);
      expect(nodes[1].vx).toBeLessThan(0);
      expect(nodes[1].vy).toBeGreaterThan(0);
      });

  it('centers Section Members on the owning Section Node bounds while keeping them out of the header', () => {
      const force = createGraphSectionBoundsForce({
          ...GRAPH_LAYOUT,
      sections: {
            'section-1': {
              ...GRAPH_LAYOUT.sections['section-1'],
              height: 200,
              width: 200,
            },
          },
        }, {
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
      sectionHeight: 200,
      sectionWidth: 200,
            x: 100,
            y: 100,
          },
          {
            id: 'src/member.ts',
            ownerSectionId: 'section-1',
            size: 10,
            vx: 0,
            vy: 0,
            x: 70,
            y: 105,
          },
        ] as unknown as FGNode[];
      force.initialize(nodes);
      force(0.5);
      expect(nodes[1].vx).toBeGreaterThan(0);
      expect(nodes[1].vy).toBeLessThan(0);
      });
});
