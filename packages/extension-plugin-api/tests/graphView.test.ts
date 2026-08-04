import { describe, expectTypeOf, it } from 'vitest';
import type {
  ExtensionGraphViewContributionSet,
  IGraphViewRuntimeNode,
  GraphViewUiContributionView,
} from '../src/graphView';

describe('Extension Graph View contracts', () => {
  it('keeps rendering contracts in the Extension Plugin API', () => {
    expectTypeOf<IGraphViewRuntimeNode>().toHaveProperty('x');
    expectTypeOf<ExtensionGraphViewContributionSet>().toHaveProperty('runtimeNodes');
    expectTypeOf<Extract<GraphViewUiContributionView, { kind: 'panel' }>>()
      .toEqualTypeOf<never>();
  });
});
