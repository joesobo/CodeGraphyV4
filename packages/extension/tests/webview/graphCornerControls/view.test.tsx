import React from 'react';
import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GraphCornerControls } from '../../../src/webview/components/graphCornerControls/view';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function firePointer(
  target: Element,
  type: 'pointerCancel' | 'pointerDown' | 'pointerLeave' | 'pointerUp',
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

describe('graphCornerControls/view', () => {
  it('renders zoom, fit, and open in editor buttons', () => {
    render(<GraphCornerControls />);

    expect(screen.getByTitle('Zoom In')).toBeInTheDocument();
    expect(screen.getByTitle('Zoom Out')).toBeInTheDocument();
    expect(screen.getByTitle('Fit to Screen')).toBeInTheDocument();
    expect(screen.getByTitle('Open in Editor')).toBeInTheDocument();
  });

  it('uses standard graph-corner hit targets', () => {
    render(<GraphCornerControls />);

    expect(screen.getByTitle('Zoom In').className).toContain('h-8');
    expect(screen.getByTitle('Zoom In').className).toContain('w-8');
    expect(screen.getByTitle('Zoom Out').className).toContain('h-8');
    expect(screen.getByTitle('Zoom Out').className).toContain('w-8');
    expect(screen.getByTitle('Fit to Screen').className).toContain('h-8');
    expect(screen.getByTitle('Open in Editor').className).toContain('h-8');
  });

  it('posts graph click control requests to the window', () => {
    const postMessage = vi.spyOn(window, 'postMessage').mockImplementation(() => undefined);

    render(<GraphCornerControls />);

    fireEvent.click(screen.getByTitle('Fit to Screen'));
    fireEvent.click(screen.getByTitle('Open in Editor'));

    expect(postMessage).toHaveBeenNthCalledWith(1, { type: 'FIT_VIEW' }, '*');
    expect(postMessage).toHaveBeenNthCalledWith(2, { type: 'REQUEST_OPEN_IN_EDITOR' }, '*');
  });

  it('posts one zoom request for a quick pointer activation', () => {
    const postMessage = vi.spyOn(window, 'postMessage').mockImplementation(() => undefined);

    render(<GraphCornerControls />);

    const zoomIn = screen.getByTitle('Zoom In');
    firePointer(zoomIn, 'pointerDown', { button: 0, pointerId: 1 });
    firePointer(zoomIn, 'pointerUp', { pointerId: 1 });
    fireEvent.click(zoomIn);

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({ type: 'ZOOM_IN' }, '*');
  });

  it('ignores non-primary pointer buttons', () => {
    const postMessage = vi.spyOn(window, 'postMessage').mockImplementation(() => undefined);

    render(<GraphCornerControls />);

    firePointer(screen.getByTitle('Zoom In'), 'pointerDown', { button: 2, pointerId: 1 });

    expect(postMessage).not.toHaveBeenCalled();
  });

  it('repeats zoom requests while the pointer is held', () => {
    vi.useFakeTimers();
    const postMessage = vi.spyOn(window, 'postMessage').mockImplementation(() => undefined);

    render(<GraphCornerControls />);

    const zoomOut = screen.getByTitle('Zoom Out');
    firePointer(zoomOut, 'pointerDown', { button: 0, pointerId: 1 });

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenLastCalledWith({ type: 'ZOOM_OUT' }, '*');

    vi.advanceTimersByTime(249);
    expect(postMessage).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    expect(postMessage).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(90);
    expect(postMessage).toHaveBeenCalledTimes(3);

    firePointer(zoomOut, 'pointerUp', { pointerId: 1 });
    vi.advanceTimersByTime(180);
    expect(postMessage).toHaveBeenCalledTimes(3);
  });

  it('keeps held zoom active when a different pointer leaves', () => {
    vi.useFakeTimers();
    const postMessage = vi.spyOn(window, 'postMessage').mockImplementation(() => undefined);

    render(<GraphCornerControls />);

    const zoomOut = screen.getByTitle('Zoom Out');
    firePointer(zoomOut, 'pointerDown', { button: 0, pointerId: 1 });
    firePointer(zoomOut, 'pointerLeave', { pointerId: 2 });
    vi.advanceTimersByTime(340);

    expect(postMessage).toHaveBeenCalledTimes(3);

    firePointer(zoomOut, 'pointerUp', { pointerId: 1 });
    vi.advanceTimersByTime(90);

    expect(postMessage).toHaveBeenCalledTimes(3);
  });

  it('captures and releases the active pointer when available', () => {
    const setPointerCapture = vi.fn();
    const hasPointerCapture = vi.fn(() => true);
    const releasePointerCapture = vi.fn();

    render(<GraphCornerControls />);

    const zoomIn = screen.getByTitle('Zoom In');
    Object.assign(zoomIn, {
      hasPointerCapture,
      releasePointerCapture,
      setPointerCapture,
    });

    firePointer(zoomIn, 'pointerDown', { button: 0, pointerId: 7 });
    firePointer(zoomIn, 'pointerUp', { pointerId: 7 });

    expect(setPointerCapture).toHaveBeenCalledWith(7);
    expect(hasPointerCapture).toHaveBeenCalledWith(7);
    expect(releasePointerCapture).toHaveBeenCalledWith(7);
  });

  it('posts zoom from keyboard activation', () => {
    const postMessage = vi.spyOn(window, 'postMessage').mockImplementation(() => undefined);

    render(<GraphCornerControls />);

    const event = createEvent.keyDown(screen.getByTitle('Zoom In'), { key: 'Enter' });
    fireEvent(screen.getByTitle('Zoom In'), event);

    expect(event.defaultPrevented).toBe(true);
    expect(postMessage).toHaveBeenCalledWith({ type: 'ZOOM_IN' }, '*');
  });

  it('stops held zoom when the window blurs', () => {
    vi.useFakeTimers();
    const postMessage = vi.spyOn(window, 'postMessage').mockImplementation(() => undefined);

    render(<GraphCornerControls />);

    firePointer(screen.getByTitle('Zoom In'), 'pointerDown', { button: 0, pointerId: 1 });
    fireEvent.blur(window);
    vi.advanceTimersByTime(500);

    expect(postMessage).toHaveBeenCalledTimes(1);
  });
});
