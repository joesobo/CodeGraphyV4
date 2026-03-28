import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const vscodeHarness = vi.hoisted(() => ({
  postMessage: vi.fn(),
}));

vi.mock('../../../src/webview/vscodeApi', () => ({
  postMessage: vscodeHarness.postMessage,
}));

import { DepthSlider } from '../../../src/webview/components/DepthSlider';

describe('DepthSlider', () => {
  it('renders the slider label, current value, and singular title', () => {
    render(<DepthSlider depthLimit={1} />);

    const slider = screen.getByLabelText('Depth:');
    expect(slider).toHaveAttribute('type', 'range');
    expect(slider).toHaveAttribute('min', '1');
    expect(slider).toHaveAttribute('max', '5');
    expect(slider).toHaveAttribute('title', 'Depth limit: 1 hop');
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders the plural title for depths greater than one', () => {
    render(<DepthSlider depthLimit={3} />);

    expect(screen.getByLabelText('Depth:')).toHaveAttribute('title', 'Depth limit: 3 hops');
  });

  it('posts the depth change message and invokes the callback', () => {
    const onDepthChange = vi.fn();

    render(<DepthSlider depthLimit={2} onDepthChange={onDepthChange} />);

    fireEvent.change(screen.getByLabelText('Depth:'), { target: { value: '4' } });

    expect(vscodeHarness.postMessage).toHaveBeenCalledWith({
      type: 'CHANGE_DEPTH_LIMIT',
      payload: { depthLimit: 4 },
    });
    expect(onDepthChange).toHaveBeenCalledWith(4);
  });

  it('does not require a local callback to handle slider changes', () => {
    render(<DepthSlider depthLimit={2} />);

    expect(() => {
      fireEvent.change(screen.getByLabelText('Depth:'), { target: { value: '5' } });
    }).not.toThrow();

    expect(vscodeHarness.postMessage).toHaveBeenCalledWith({
      type: 'CHANGE_DEPTH_LIMIT',
      payload: { depthLimit: 5 },
    });
  });
});
