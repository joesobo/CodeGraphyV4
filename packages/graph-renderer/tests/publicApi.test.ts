import { describe, expect, expectTypeOf, it } from 'vitest';

import * as graphRenderer from '../src/index';
import {
  createGraphLayoutEngine,
  WebGpuGraphRenderer,
  prepareGraphPhysics,
  type GraphLayoutEngine,
  type GraphRendererFrame,
} from '../src/index';

describe('graph renderer public API', () => {
  it('exposes only the rendering and physics engine boundary', () => {
    expect(createGraphLayoutEngine).toBeTypeOf('function');
    expect(WebGpuGraphRenderer).toBeTypeOf('function');
    expect(prepareGraphPhysics).toBeTypeOf('function');
    expectTypeOf<GraphLayoutEngine>().toBeObject();
    expectTypeOf<GraphRendererFrame>().toBeObject();
    expect(graphRenderer).not.toHaveProperty('DEFAULT_GRAPH_LAYOUT_CONFIG');
    expect(graphRenderer).not.toHaveProperty('OwnedWebGpuRenderer');
    expect(graphRenderer).not.toHaveProperty('TypedGraphLayoutEngine');
    expect(graphRenderer).not.toHaveProperty('installGraphPhysicsModule');
    expect(graphRenderer).not.toHaveProperty('parseWebGpuColor');
    expect(graphRenderer).not.toHaveProperty('webGpuNodeShapeCode');
  });
});
