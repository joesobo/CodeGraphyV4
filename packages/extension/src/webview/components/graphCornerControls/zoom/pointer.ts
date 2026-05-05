import type {
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
} from 'react';

type ButtonPointerEvent = ReactPointerEvent<HTMLButtonElement>;

export function captureActivePointer(
  event: ButtonPointerEvent,
  activePointerIdRef: MutableRefObject<number | null>,
): void {
  event.currentTarget.setPointerCapture?.(event.pointerId);
  activePointerIdRef.current = event.pointerId;
}

export function shouldIgnorePointerStop(
  activePointerId: number | null,
  event: ButtonPointerEvent,
): boolean {
  return activePointerId !== null && event.pointerId !== activePointerId;
}

export function releasePointerCapture(event: ButtonPointerEvent): void {
  if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
}
