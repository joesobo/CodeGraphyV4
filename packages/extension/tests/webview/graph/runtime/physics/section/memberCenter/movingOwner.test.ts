import { describe, expect, it } from 'vitest';
import {
  SETTINGS,
  GRAPH_LAYOUT,
  createGraphSectionBoundsForce,
  type FGNode,
} from '../../testSupport';

describe('physics/section member center moving owner', () => {
  it('keeps Section Members centered relative to their owner while the Section moves around graph origin', () => {
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
      settings: {
            ...SETTINGS,
            centerForce: 1,
            linkForce: 0,
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
      const member = {
          id: 'src/member.ts',
          size: 10,
          x: 625,
          y: 25,
        };
      const nodes = [section, member] as unknown as FGNode[];
      const sectionPositions = [
          { x: 600, y: 0 },
          { x: 0, y: 600 },
          { x: -600, y: 0 },
          { x: 0, y: -600 },
          { x: 600, y: 0 },
        ];
      force.initialize(nodes);
        for (const position of sectionPositions) {
      section.x = position.x;
      section.y = position.y;
      force(1);
      expect(member.x - section.x).toBeGreaterThan(-30);
      expect(member.x - section.x).toBeLessThan(30);
      expect(member.y - section.y).toBeGreaterThan(-30);
      expect(member.y - section.y).toBeLessThan(30);
        }
      });
});
