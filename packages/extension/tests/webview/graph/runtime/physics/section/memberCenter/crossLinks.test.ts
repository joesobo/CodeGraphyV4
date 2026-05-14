import { describe, expect, it } from 'vitest';
import {
  SETTINGS,
  GRAPH_LAYOUT,
  createGraphSectionBoundsForce,
  type FGNode,
} from '../../testSupport';

describe('physics/section member center cross links', () => {
  it('does not pull Section Members toward graph origin through cross-section links while the owner moves', () => {
      const graphLayout = {
          ...GRAPH_LAYOUT,
      sections: {
            'section-1': {
              ...GRAPH_LAYOUT.sections['section-1'],
              height: 200,
              width: 200,
            },
          },
        };
      const force = createGraphSectionBoundsForce(graphLayout, {
          links: [
            {
              id: 'root-to-member',
              source: 'src/root.ts',
              target: 'src/member.ts',
            } as never,
          ],
      settings: {
            ...SETTINGS,
            centerForce: 1,
            linkDistance: 100,
            linkForce: 1,
            repelForce: 0,
          },
        });
      const section = {
          id: 'section-1',
          isDragging: true,
          isGraphSection: true,
      sectionHeight: 200,
      sectionWidth: 200,
          x: 600,
          y: 0,
        };
      const root = {
          id: 'src/root.ts',
          size: 10,
          x: 0,
          y: 0,
        };
      const member = {
          id: 'src/member.ts',
          size: 10,
          x: 600,
          y: 0,
        };
      const nodes = [section, root, member] as unknown as FGNode[];
      force.initialize(nodes);
      force(1);
      expect(member.x - section.x).toBeGreaterThan(-30);
      expect(member.x - section.x).toBeLessThan(30);
      });
});
