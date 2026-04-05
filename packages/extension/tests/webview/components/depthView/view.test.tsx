import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
const sliderHarness = vi.hoisted(() => ({
  onValueChange: null as null | ((value: number[]) => void),
}));

vi.mock('../../../../src/webview/vscodeApi', () => ({
  postMessage: vi.fn(),
}));

vi.mock('../../../../src/webview/components/ui/controls/slider', () => ({
  Slider: (props: {
    value: number[];
    onValueChange: (value: number[]) => void;
    min: number;
    max: number;
    step: number;
  }) => {
    sliderHarness.onValueChange = props.onValueChange;
    return (
      <input
        data-testid="depth-view-slider"
        role="slider"
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value[0]}
        onChange={event => props.onValueChange([Number(event.currentTarget.value)])}
      />
    );
  },
}));

import { DepthViewControls } from '../../../../src/webview/components/depthView/view';
import { graphStore } from '../../../../src/webview/store/state';

import { postMessage } from '../../../../src/webview/vscodeApi';

describe('DepthViewControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sliderHarness.onValueChange = null;
    graphStore.setState({
      activeViewId: 'codegraphy.connections',
      depthLimit: 1,
      maxDepthLimit: 10,
    });
  });

  it('renders nothing when depth view is not active', () => {
    render(<DepthViewControls />);

    expect(screen.queryByTestId('depth-view-controls')).not.toBeInTheDocument();
  });

  it('renders the slider and current value when depth view is active', () => {
    graphStore.setState({
      activeViewId: 'codegraphy.depth-graph',
      depthLimit: 3,
      maxDepthLimit: 4,
    });

    render(<DepthViewControls />);

    expect(screen.getByTestId('depth-view-controls')).toBeInTheDocument();
    expect(screen.getByTestId('depth-view-controls').className).toContain('pl-16');
    expect(screen.getByTestId('depth-view-controls').className).toContain('pr-4');
    expect(screen.getByTestId('depth-view-slider')).toBeInTheDocument();
    expect(screen.getByTestId('depth-view-shell')).toBeInTheDocument();
    expect(screen.getByTestId('depth-view-value')).toBeInTheDocument();
    expect(screen.getByText('Depth')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByTestId('depth-view-max')).toHaveTextContent('4');
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('posts CHANGE_DEPTH_LIMIT when the slider changes', () => {
    graphStore.setState({
      activeViewId: 'codegraphy.depth-graph',
      depthLimit: 2,
      maxDepthLimit: 4,
    });

    render(<DepthViewControls />);

    expect(sliderHarness.onValueChange).not.toBeNull();
    fireEvent.change(screen.getByRole('slider'), { target: { value: '4' } });

    expect(postMessage).toHaveBeenCalledWith({
      type: 'CHANGE_DEPTH_LIMIT',
      payload: { depthLimit: 4 },
    });
  });

  it('renders a compact icon and value pill when only one depth is available', () => {
    graphStore.setState({
      activeViewId: 'codegraphy.depth-graph',
      depthLimit: 3,
      maxDepthLimit: 1,
    });

    render(<DepthViewControls />);

    expect(screen.getByTestId('depth-view-controls')).toBeInTheDocument();
    expect(screen.getByTestId('depth-view-compact')).toBeInTheDocument();
    expect(screen.getByTestId('depth-view-value')).toHaveTextContent('1');
    expect(screen.queryByTestId('depth-view-slider')).not.toBeInTheDocument();
    expect(screen.queryByText('Depth')).not.toBeInTheDocument();
    expect(screen.queryByTestId('depth-view-max')).not.toBeInTheDocument();
  });
});
