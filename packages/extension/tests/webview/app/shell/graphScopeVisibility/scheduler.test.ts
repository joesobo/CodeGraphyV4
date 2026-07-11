import { afterEach, describe, expect, it, vi } from 'vitest';

import { createGraphScopeProjection } from '../../../../../src/webview/app/shell/graphScopeVisibility/projection';
import {
  cancelProjectionFrame,
  synchronizeGraphScopeProjection,
  type GraphScopeProjectionRuntime,
} from '../../../../../src/webview/app/shell/graphScopeVisibility/scheduler';

function setup() {
  const rendered = createGraphScopeProjection(1, { file: true }, { import: true });
  const runtime: GraphScopeProjectionRuntime = {
    pendingRef: { current: undefined },
    renderedRef: { current: rendered },
    setRendered: vi.fn(),
    frameRef: { current: undefined },
    timerRef: { current: undefined },
  };
  return { rendered, runtime };
}

describe('webview/app/shell/graphScopeVisibility/scheduler', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
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

  it('publishes the latest coalesced node projection on the next animation frame', () => {
		vi.useFakeTimers();
    const { runtime } = setup();
    const pending = createGraphScopeProjection(2, { file: false }, { import: true });
    const latest = createGraphScopeProjection(3, { file: false, folder: true }, { import: false });
    let publishFrame: FrameRequestCallback | undefined;
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      publishFrame = callback;
      return 41;
    }));

    synchronizeGraphScopeProjection(pending, runtime);
    synchronizeGraphScopeProjection(latest, runtime);

    expect(runtime.setRendered).not.toHaveBeenCalled();
    expect(requestAnimationFrame).toHaveBeenCalledOnce();
    publishFrame?.(16);

    expect(runtime.setRendered).toHaveBeenCalledOnce();
    expect(runtime.setRendered).toHaveBeenCalledWith(latest);
    expect(runtime.pendingRef.current).toBeUndefined();
    expect(runtime.frameRef.current).toBeUndefined();
		expect(runtime.timerRef.current).toBeUndefined();
  });

	it('publishes within one frame budget when animation frames are throttled', () => {
		vi.useFakeTimers();
		const { runtime } = setup();
		const next = createGraphScopeProjection(2, { file: false }, { import: true });
		vi.stubGlobal('requestAnimationFrame', vi.fn(() => 51));
		vi.stubGlobal('cancelAnimationFrame', vi.fn());

		synchronizeGraphScopeProjection(next, runtime);
		vi.advanceTimersByTime(15);
		expect(runtime.setRendered).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);

		expect(runtime.setRendered).toHaveBeenCalledWith(next);
		expect(cancelAnimationFrame).toHaveBeenCalledWith(51);
	});

  it('cancels and clears a scheduled projection frame', () => {
    const frameRef = { current: 42 as number | undefined };
		const timerRef = { current: setTimeout(() => {}, 100) as ReturnType<typeof setTimeout> | undefined };
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    cancelProjectionFrame(frameRef, timerRef);

    expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
    expect(frameRef.current).toBeUndefined();
		expect(timerRef.current).toBeUndefined();
  });
});
