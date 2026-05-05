import { describe, expect, it, vi } from 'vitest';
import type {
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
} from 'react';
import {
  captureActivePointer,
  releasePointerCapture,
  shouldIgnorePointerStop,
} from '../../../../src/webview/components/graphCornerControls/zoom/pointer';

type ButtonPointerEvent = ReactPointerEvent<HTMLButtonElement>;

function pointerEvent(
  pointerId: number,
  target: Partial<HTMLButtonElement> = {},
): ButtonPointerEvent {
  return {
    currentTarget: target,
    pointerId,
  } as ButtonPointerEvent;
}

describe('graphCornerControls/zoom/pointer', () => {
  it('captures the active pointer id when pointer capture is available', () => {
    const setPointerCapture = vi.fn();
    const activePointerIdRef: MutableRefObject<number | null> = { current: null };

    captureActivePointer(pointerEvent(12, { setPointerCapture }), activePointerIdRef);

    expect(setPointerCapture).toHaveBeenCalledWith(12);
    expect(activePointerIdRef.current).toBe(12);
  });

  it('allows stops when no active pointer is tracked or when the active pointer matches', () => {
    expect(shouldIgnorePointerStop(null, pointerEvent(1))).toBe(false);
    expect(shouldIgnorePointerStop(1, pointerEvent(1))).toBe(false);
  });

  it('ignores stop events from a different active pointer', () => {
    expect(shouldIgnorePointerStop(1, pointerEvent(2))).toBe(true);
  });

  it('releases pointer capture only when the current target owns it', () => {
    const release = vi.fn();

    releasePointerCapture(pointerEvent(1, {
      hasPointerCapture: () => true,
      releasePointerCapture: release,
    }));

    expect(release).toHaveBeenCalledWith(1);
  });

  it('does not release pointer capture when the current target does not own it', () => {
    const releasePointerCaptureSpy = vi.fn();

    releasePointerCapture(pointerEvent(1, {
      hasPointerCapture: () => false,
      releasePointerCapture: releasePointerCaptureSpy,
    }));

    expect(releasePointerCaptureSpy).not.toHaveBeenCalled();
  });
});
