import { describe, expect, it } from 'vitest';
import {
  SETTINGS,
  GRAPH_LAYOUT,
  createPhysicsInstance,
  getInstalledD3Force,
  forceSimulation,
  initPhysics,
  type FGNode,
} from '../../testSupport';

describe('physics/section member center off-origin owner', () => {
  it('settles Section Members from saved ownership around a pinned off-origin Section center instead of graph origin', () => {
      const graphLayout = {
          ...GRAPH_LAYOUT,
      sections: {
            'section-1': {
              ...GRAPH_LAYOUT.sections['section-1'],
              x: 900,
              y: -300,
              height: 200,
              width: 200,
            },
          },
          pinnedNodes: {
            'section-1': {
              nodeId: 'section-1',
              '2D': { x: 1000, y: -200 },
            },
          },
        };
      const { d3Force, instance } = createPhysicsInstance();
      const settings = {
          ...SETTINGS,
          centerForce: 1,
          linkForce: 0,
          repelForce: 0,
        };
      const nodes = [
          {
            id: 'section-1',
            isGraphSection: true,
            isPinned: true,
      sectionHeight: 200,
      sectionWidth: 200,
            fx: 1000,
            fy: -200,
            x: 1000,
            y: -200,
          },
          {
            id: 'src/member.ts',
            size: 10,
            x: 925,
            y: -175,
          },
        ] as unknown as FGNode[];

        initPhysics(instance, settings, { graphLayout, graphMode: '2d' });
      const simulation = forceSimulation(nodes)
          .velocityDecay(settings.damping)
          .force('forceX', getInstalledD3Force(d3Force, 'forceX'))
          .force('forceY', getInstalledD3Force(d3Force, 'forceY'))
          .force('collision', getInstalledD3Force(d3Force, 'collision'))
          .force('sectionBounds', getInstalledD3Force(d3Force, 'sectionBounds'))
          .stop();

        for (let tick = 0; tick < 200; tick += 1) {
      simulation.tick();
        }
      expect(nodes[1].x).toBeGreaterThan(970);
      expect(nodes[1].x).toBeLessThan(1030);
      expect(nodes[1].y).toBeGreaterThan(-230);
      expect(nodes[1].y).toBeLessThan(-170);
      });
});
