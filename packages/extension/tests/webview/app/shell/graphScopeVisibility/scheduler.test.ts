import { afterEach, describe, expect, it, vi } from 'vitest';

import { createGraphScopeProjection } from '../../../../../src/webview/app/shell/graphScopeVisibility/projection';
import {
  cancelProjectionTimer,
  GRAPH_SCOPE_RENDER_DEBOUNCE_MS,
  synchronizeGraphScopeProjection,
  type GraphScopeProjectionRuntime,
} from '../../../../../src/webview/app/shell/graphScopeVisibility/scheduler';

function setup() {
  const rendered = createGraphScopeProjection(1, { file: true }, { import: true });
  const runtime: GraphScopeProjectionRuntime = {
    pendingRef: { current: undefined },
    renderedRef: { current: rendered },
    setRendered: vi.fn(),
    timerRef: { current: undefined },
  };
  return { rendered, runtime };
}

describe('webview/app/shell/graphScopeVisibility/scheduler', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('publishes a semantically matching node projection immediately', () => {
    vi.useFakeTimers();
    const { runtime } = setup();
    const next = createGraphScopeProjection(2, { file: true }, { import: false });

    synchronizeGraphScopeProjection(next, runtime);

    expect(runtime.setRendered).toHaveBeenCalledWith(next);
    expect(runtime.pendingRef.current).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('publishes the latest coalesced node projection at the original deadline', () => {
    vi.useFakeTimers();
    const { runtime } = setup();
    const pending = createGraphScopeProjection(2, { file: false }, { import: true });
    const latest = createGraphScopeProjection(3, { file: false, folder: true }, { import: false });

    synchronizeGraphScopeProjection(pending, runtime);
    vi.advanceTimersByTime(GRAPH_SCOPE_RENDER_DEBOUNCE_MS / 2);
    synchronizeGraphScopeProjection(latest, runtime);
    vi.advanceTimersByTime(GRAPH_SCOPE_RENDER_DEBOUNCE_MS / 2);

    expect(runtime.setRendered).toHaveBeenCalledOnce();
    expect(runtime.setRendered).toHaveBeenCalledWith(latest);
    expect(runtime.pendingRef.current).toBeUndefined();
    expect(runtime.timerRef.current).toBeUndefined();
  });

  it('cancels and clears a scheduled projection timer', () => {
    vi.useFakeTimers();
    const timerRef = { current: setTimeout(() => {}, 100) as ReturnType<typeof setTimeout> | undefined };

    cancelProjectionTimer(timerRef);

    expect(timerRef.current).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });
});
