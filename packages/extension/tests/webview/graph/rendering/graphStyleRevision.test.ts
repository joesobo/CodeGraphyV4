import { describe, expect, it } from 'vitest';
import { markCssColorsChanged } from '../../../../src/webview/cssColors/resolver';
import {
  createGraphBaseStyleRevision,
  createGraphStyleRevision,
} from '../../../../src/webview/components/graph/rendering/graphStyleRevision';
import type { GraphCallbackContext } from '../../../../src/webview/components/graph/rendering/useGraphCallbacks';

function createContext(): GraphCallbackContext {
  return {
    edgeDecorationsRef: { current: undefined },
    graphAppearanceRef: { current: {} },
    highlightedNeighborsRef: { current: new Set() },
    highlightedNodeRef: { current: null },
    nodeDecorationsRef: { current: undefined },
    selectedNodesSetRef: { current: new Set() },
  } as unknown as GraphCallbackContext;
}

describe('graph/rendering/graphStyleRevision', () => {
  it('invalidates cached GPU styles after injected CSS colors change', () => {
    const revision = createGraphStyleRevision();
    const context = createContext();
    const initial = revision(context);

    expect(revision(context)).toBe(initial);

    markCssColorsChanged();

    expect(revision(context)).toBe(initial + 1);
  });

  it('invalidates base styles only after CSS colors change', () => {
    const revision = createGraphBaseStyleRevision();
    const initial = revision();

    expect(revision()).toBe(initial);
    markCssColorsChanged();
    expect(revision()).toBe(initial + 1);
  });
});
