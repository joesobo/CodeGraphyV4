import { describe, expect, it } from 'vitest';
import {
  SETTINGS,
  GRAPH_LAYOUT,
  createPhysicsInstance,
  initPhysics,
} from '../testSupport';

describe('physics/section force binding', () => {
  it('initializes section bounds forces when Graph Layout is available in 2D', () => {
    const { d3Force, instance } = createPhysicsInstance();

      initPhysics(instance, SETTINGS, { graphLayout: GRAPH_LAYOUT, graphMode: '2d' });
    expect(d3Force).toHaveBeenCalledWith('sectionBounds', expect.any(Function));
    });

  it('does not initialize section bounds forces in 3D', () => {
    const { d3Force, instance } = createPhysicsInstance();

      initPhysics(instance, SETTINGS, { graphLayout: GRAPH_LAYOUT, graphMode: '3d' });
    expect(d3Force).toHaveBeenCalledWith('sectionBounds', null);
    });
});
