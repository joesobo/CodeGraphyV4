import { describe, expect, it } from 'vitest';
import {
  SETTINGS,
  GRAPH_LAYOUT,
  createGraphSectionBoundsForce,
  type FGNode,
} from '../../testSupport';

describe('physics/section member center disabled force', () => {
  it('uses the configured center force for local Section Member physics', () => {
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
            x: 100,
            y: 70,
          },
          {
            id: 'src/member.ts',
            ownerSectionId: 'section-1',
            size: 10,
            vx: 0,
            vy: 0,
            x: 70,
            y: 80,
          },
        ] as FGNode[];
      force.initialize(nodes);
      force(0.5);
      expect(nodes[1]).toMatchObject({
          vx: 0,
          vy: 0,
          x: 70,
          y: 80,
        });
      });
});
