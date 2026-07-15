import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  createGraphLayoutEngine,
  OwnedWebGpuRenderer,
  prepareGraphPhysics,
  type GraphLayoutEngine,
  type GraphRendererFrame,
} from '../src/index';

describe('graph renderer public API', () => {
  it('exposes only the rendering and physics engine boundary', () => {
    expect(createGraphLayoutEngine).toBeTypeOf('function');
    expect(OwnedWebGpuRenderer).toBeTypeOf('function');
    expect(prepareGraphPhysics).toBeTypeOf('function');
    expectTypeOf<GraphLayoutEngine>().toBeObject();
    expectTypeOf<GraphRendererFrame>().toBeObject();
  });
});
