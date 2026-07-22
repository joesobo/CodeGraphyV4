import { describe, expectTypeOf, it } from 'vitest';
import type {
  CodeGraphyWebviewAPI,
  GraphViewViewportState,
  IGraphViewContributions,
  NodeRenderFn,
  OverlayRenderFn,
  TooltipProviderFn,
} from '../src/index';

describe('CodeGraphyWebviewAPI', () => {
  it('publishes the Graph View runtime capabilities implemented by the host', () => {
    expectTypeOf<CodeGraphyWebviewAPI['registerGraphViewContributions']>()
      .parameter(0).toEqualTypeOf<IGraphViewContributions>();
    expectTypeOf<CodeGraphyWebviewAPI['getGraphViewViewportState']>()
      .returns.toEqualTypeOf<GraphViewViewportState | null>();
    expectTypeOf<CodeGraphyWebviewAPI['onGraphViewViewportState']>()
      .parameter(0).toEqualTypeOf<(state: GraphViewViewportState | null) => void>();
    expectTypeOf<CodeGraphyWebviewAPI['registerNodeRenderer']>()
      .parameter(1).toEqualTypeOf<NodeRenderFn>();
    expectTypeOf<CodeGraphyWebviewAPI['registerOverlay']>()
      .parameter(1).toEqualTypeOf<OverlayRenderFn>();
    expectTypeOf<CodeGraphyWebviewAPI['registerTooltipProvider']>()
      .parameter(0).toEqualTypeOf<TooltipProviderFn>();
    expectTypeOf<CodeGraphyWebviewAPI['helpers']>().toHaveProperty('drawBadge');
    expectTypeOf<CodeGraphyWebviewAPI['helpers']>().toHaveProperty('drawProgressRing');
    expectTypeOf<CodeGraphyWebviewAPI['helpers']>().toHaveProperty('drawLabel');
  });
});
