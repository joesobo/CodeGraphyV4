import React from 'react';
import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useContinuousZoomControl } from '../../../../src/webview/components/graphCornerControls/zoom/hook';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function firePointer(
  target: Element,
  type: 'pointerDown' | 'pointerLeave' | 'pointerUp',
  options: { button?: number; pointerId?: number },
): void {
  const event = createEvent[type](target);
  if (typeof options.button === 'number') {
    Object.defineProperty(event, 'button', { value: options.button });
  }
  if (typeof options.pointerId === 'number') {
    Object.defineProperty(event, 'pointerId', { value: options.pointerId });
  }
  fireEvent(target, event);
}

function fireKey(target: Element, key: string): void {
  const event = createEvent.keyDown(target);
  Object.defineProperty(event, 'key', { value: key });
  fireEvent(target, event);
}

function ZoomHarness({ postZoom }: { postZoom: () => void }): React.JSX.Element {
  return (
    <button title="Zoom" type="button" {...useContinuousZoomControl(postZoom)}>
      Zoom
    </button>
  );
}

describe('graphCornerControls/zoom/hook', () => {
  it('repeats zoom while a primary pointer is held', () => {
    vi.useFakeTimers();
    const postZoom = vi.fn();

    render(<ZoomHarness postZoom={postZoom} />);

    const zoom = screen.getByTitle('Zoom');
    firePointer(zoom, 'pointerDown', { button: 0, pointerId: 1 });
    vi.advanceTimersByTime(340);
    firePointer(zoom, 'pointerUp', { pointerId: 1 });
    vi.advanceTimersByTime(90);

    expect(postZoom).toHaveBeenCalledTimes(3);
  });

  it('ignores secondary pointer buttons', () => {
    const postZoom = vi.fn();

    render(<ZoomHarness postZoom={postZoom} />);

    firePointer(screen.getByTitle('Zoom'), 'pointerDown', { button: 2, pointerId: 1 });

    expect(postZoom).not.toHaveBeenCalled();
  });

  it('keeps held zoom active when another pointer leaves', () => {
    vi.useFakeTimers();
    const postZoom = vi.fn();

    render(<ZoomHarness postZoom={postZoom} />);

    const zoom = screen.getByTitle('Zoom');
    firePointer(zoom, 'pointerDown', { button: 0, pointerId: 1 });
    firePointer(zoom, 'pointerLeave', { pointerId: 2 });
    vi.advanceTimersByTime(340);

    expect(postZoom).toHaveBeenCalledTimes(3);
  });

  it('keeps held zoom active when another pointer is released', () => {
    vi.useFakeTimers();
    const postZoom = vi.fn();

    render(<ZoomHarness postZoom={postZoom} />);

    const zoom = screen.getByTitle('Zoom');
    firePointer(zoom, 'pointerDown', { button: 0, pointerId: 1 });
    firePointer(zoom, 'pointerUp', { pointerId: 2 });
    vi.advanceTimersByTime(340);

    expect(postZoom).toHaveBeenCalledTimes(3);
  });

  it('posts one zoom request for Enter and Space keys', () => {
    const postZoom = vi.fn();

    render(<ZoomHarness postZoom={postZoom} />);

    const zoom = screen.getByTitle('Zoom');
    fireKey(zoom, 'Enter');
    fireKey(zoom, ' ');
    fireKey(zoom, 'Escape');

    expect(postZoom).toHaveBeenCalledTimes(2);
  });

  it('uses the latest zoom callback after rerendering', () => {
    const firstPostZoom = vi.fn();
    const secondPostZoom = vi.fn();
    const { rerender } = render(<ZoomHarness postZoom={firstPostZoom} />);

    rerender(<ZoomHarness postZoom={secondPostZoom} />);
    fireKey(screen.getByTitle('Zoom'), 'Enter');

    expect(firstPostZoom).not.toHaveBeenCalled();
    expect(secondPostZoom).toHaveBeenCalledTimes(1);
  });

  it('removes the blur listener and clears timers on unmount', () => {
    vi.useFakeTimers();
    const removeEventListener = vi.spyOn(window, 'removeEventListener');
    const postZoom = vi.fn();
    const { unmount } = render(<ZoomHarness postZoom={postZoom} />);

    firePointer(screen.getByTitle('Zoom'), 'pointerDown', { button: 0, pointerId: 1 });
    unmount();
    vi.advanceTimersByTime(340);

    expect(removeEventListener).toHaveBeenCalledWith('blur', expect.any(Function));
    expect(postZoom).toHaveBeenCalledTimes(1);
  });

  it('clears held zoom when the window blurs', () => {
    vi.useFakeTimers();
    const postZoom = vi.fn();

    render(<ZoomHarness postZoom={postZoom} />);

    firePointer(screen.getByTitle('Zoom'), 'pointerDown', { button: 0, pointerId: 1 });
    window.dispatchEvent(new Event('blur'));
    vi.advanceTimersByTime(340);

    expect(postZoom).toHaveBeenCalledTimes(1);
  });
});
