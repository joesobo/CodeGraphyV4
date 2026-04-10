import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GraphCornerControls } from '../../../src/webview/components/graphCornerControls/view';

describe('graphCornerControls/view', () => {
  it('renders zoom and fit buttons', () => {
    render(<GraphCornerControls />);

    expect(screen.getByTitle('Zoom In')).toBeInTheDocument();
    expect(screen.getByTitle('Zoom Out')).toBeInTheDocument();
    expect(screen.getByTitle('Fit to Screen')).toBeInTheDocument();
  });

  it('posts graph control messages to the window when clicked', () => {
    const postMessage = vi.spyOn(window, 'postMessage').mockImplementation(() => undefined);

    render(<GraphCornerControls />);

    fireEvent.click(screen.getByTitle('Zoom In'));
    fireEvent.click(screen.getByTitle('Zoom Out'));
    fireEvent.click(screen.getByTitle('Fit to Screen'));

    expect(postMessage).toHaveBeenNthCalledWith(1, { type: 'ZOOM_IN' }, '*');
    expect(postMessage).toHaveBeenNthCalledWith(2, { type: 'ZOOM_OUT' }, '*');
    expect(postMessage).toHaveBeenNthCalledWith(3, { type: 'FIT_VIEW' }, '*');

    postMessage.mockRestore();
  });
});
