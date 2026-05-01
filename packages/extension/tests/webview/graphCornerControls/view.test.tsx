import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GraphCornerControls } from '../../../src/webview/components/graphCornerControls/view';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('graphCornerControls/view', () => {
  it('renders zoom, fit, and open in editor buttons', () => {
    render(<GraphCornerControls />);

    expect(screen.getByTitle('Zoom In')).toBeInTheDocument();
    expect(screen.getByTitle('Zoom Out')).toBeInTheDocument();
    expect(screen.getByTitle('Fit to Screen')).toBeInTheDocument();
    expect(screen.getByTitle('Open in Editor')).toBeInTheDocument();
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
    fireEvent.pointerDown(zoomIn, { button: 0, pointerId: 1 });
    fireEvent.pointerUp(zoomIn, { pointerId: 1 });
    fireEvent.click(zoomIn);

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({ type: 'ZOOM_IN' }, '*');
  });

  it('repeats zoom requests while the pointer is held', () => {
    vi.useFakeTimers();
    const postMessage = vi.spyOn(window, 'postMessage').mockImplementation(() => undefined);

    render(<GraphCornerControls />);

    const zoomOut = screen.getByTitle('Zoom Out');
    fireEvent.pointerDown(zoomOut, { button: 0, pointerId: 1 });

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenLastCalledWith({ type: 'ZOOM_OUT' }, '*');

    vi.advanceTimersByTime(249);
    expect(postMessage).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    expect(postMessage).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(90);
    expect(postMessage).toHaveBeenCalledTimes(3);

    fireEvent.pointerUp(zoomOut, { pointerId: 1 });
    vi.advanceTimersByTime(180);
    expect(postMessage).toHaveBeenCalledTimes(3);
  });

  it('stops held zoom when the window blurs', () => {
    vi.useFakeTimers();
    const postMessage = vi.spyOn(window, 'postMessage').mockImplementation(() => undefined);

    render(<GraphCornerControls />);

    fireEvent.pointerDown(screen.getByTitle('Zoom In'), { button: 0, pointerId: 1 });
    fireEvent.blur(window);
    vi.advanceTimersByTime(500);

    expect(postMessage).toHaveBeenCalledTimes(1);
  });
});
