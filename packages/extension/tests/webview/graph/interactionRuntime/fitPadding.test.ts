import { describe, expect, it } from 'vitest';
import type { FGNode } from '../../../../src/webview/components/graph/model/build';
import { MIN_FIT_VIEW_PADDING, getFitViewPadding } from '../../../../src/webview/components/graph/interactionRuntime/fitPadding';

function node(size?: number): FGNode {
  return {
    id: 'node',
    label: 'node',
    color: '#fff',
    size,
  } as FGNode;
}

describe('graph/interactionRuntime/fitPadding', () => {
  it('uses the minimum padding when nodes have no finite size', () => {
    expect(getFitViewPadding([node(undefined), node(Number.NaN)])).toBe(MIN_FIT_VIEW_PADDING);
  });

  it('uses the minimum padding for zero-sized nodes', () => {
    expect(getFitViewPadding([node(0)])).toBe(MIN_FIT_VIEW_PADDING);
  });

  it('ignores infinite sizes when a finite size is available', () => {
    expect(getFitViewPadding([node(Number.POSITIVE_INFINITY), node(12)])).toBe(56);
  });

  it('pads by the largest finite node size', () => {
    expect(getFitViewPadding([node(12), node(44)])).toBe(152);
  });
});
