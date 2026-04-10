import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GraphCornerControls } from '../../../src/webview/components/graphCornerControls/view';

const sentMessages: unknown[] = [];

vi.mock('../../../src/webview/vscodeApi', () => ({
  postMessage: (message: unknown) => sentMessages.push(message),
  vscode: { getState: () => undefined, setState: vi.fn() },
}));

describe('graphCornerControls/view', () => {
  it('renders zoom, fit, and open in editor buttons', () => {
    render(<GraphCornerControls />);

    expect(screen.getByTitle('Zoom In')).toBeInTheDocument();
    expect(screen.getByTitle('Zoom Out')).toBeInTheDocument();
    expect(screen.getByTitle('Fit to Screen')).toBeInTheDocument();
    expect(screen.getByTitle('Open in Editor')).toBeInTheDocument();
  });

  it('posts graph control messages to the window and sends open in editor to vscode', () => {
    sentMessages.length = 0;
    const postMessage = vi.spyOn(window, 'postMessage').mockImplementation(() => undefined);

    render(<GraphCornerControls />);

    fireEvent.click(screen.getByTitle('Zoom In'));
    fireEvent.click(screen.getByTitle('Zoom Out'));
    fireEvent.click(screen.getByTitle('Fit to Screen'));
    fireEvent.click(screen.getByTitle('Open in Editor'));

    expect(postMessage).toHaveBeenNthCalledWith(1, { type: 'ZOOM_IN' }, '*');
    expect(postMessage).toHaveBeenNthCalledWith(2, { type: 'ZOOM_OUT' }, '*');
    expect(postMessage).toHaveBeenNthCalledWith(3, { type: 'FIT_VIEW' }, '*');
    expect(sentMessages).toEqual([{ type: 'OPEN_IN_EDITOR' }]);

    postMessage.mockRestore();
  });
});
