import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OwnedGraphSurface from '../../../__mocks__/ownedGraphSurface';
import Graph from '../../../../src/webview/components/graph/view/component';
import { DEFAULT_DIRECTION_COLOR } from '../../../../src/shared/fileColors';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import { graphStore } from '../../../../src/webview/store/state';

const graphData: IGraphData = {
  nodes: [
    { id: 'src/app.ts', label: 'app.ts', color: '#93c5fd', x: 100, y: 100 },
    { id: 'src/utils.ts', label: 'utils.ts', color: '#67e8f9', x: 140, y: 120 },
    { id: 'README.md', label: 'README.md', color: '#facc15', x: 300, y: 300 },
  ],
  edges: [],
};

function setStore(overrides: Record<string, unknown> = {}): void {
  graphStore.setState({
    favorites: new Set<string>(),
    bidirectionalMode: 'separate',
    physicsSettings: {
      repelForce: 10,
      linkDistance: 80,
      linkForce: 0.15,
      damping: 0.7,
      centerForce: 0.1,
    },
    nodeSizeMode: 'connections',
    directionMode: 'arrows',
    directionColor: DEFAULT_DIRECTION_COLOR,
    particleSpeed: 0.005,
    particleSize: 4,
    showLabels: true,
    ...overrides,
  });
}

describe('graph/marqueeSelection view', () => {
  beforeEach(() => {
    OwnedGraphSurface.clearAllHandlers();
    vi.clearAllMocks();
    setStore();
  });

  it('shows the marquee rectangle while dragging and selects nodes inside it', async () => {
    render(<Graph data={graphData} />);
    const container = document.querySelector('.graph-container') as HTMLElement;

    act(() => {
      fireEvent.mouseDown(container, { button: 0, clientX: 90, clientY: 90 });
      fireEvent.mouseMove(container, { button: 0, clientX: 170, clientY: 150 });
    });

    expect(screen.getByTestId('graph-marquee-selection')).toBeInTheDocument();

    act(() => {
      fireEvent.mouseUp(container, { button: 0, clientX: 170, clientY: 150 });
    });

    await waitFor(() => {
      expect(screen.queryByTestId('graph-marquee-selection')).not.toBeInTheDocument();
    });

    act(() => {
      OwnedGraphSurface.simulateNodeRightClick({ id: 'src/app.ts' });
    });

    expect(await screen.findByText('Open 2 Files')).toBeInTheDocument();
  });

  it('shows the marquee rectangle while Shift-left-dragging to extend selection', () => {
    render(<Graph data={graphData} />);
    const container = document.querySelector('.graph-container') as HTMLElement;

    act(() => {
      fireEvent.mouseDown(container, { button: 0, shiftKey: true, clientX: 90, clientY: 90 });
      fireEvent.mouseMove(container, { button: 0, shiftKey: true, clientX: 170, clientY: 150 });
    });

    expect(screen.getByTestId('graph-marquee-selection')).toBeInTheDocument();
  });

  it('clears an active marquee when the pointer leaves the graph', () => {
    render(<Graph data={graphData} />);
    const container = document.querySelector('.graph-container') as HTMLElement;

    act(() => {
      fireEvent.mouseDown(container, { button: 0, clientX: 90, clientY: 90 });
      fireEvent.mouseMove(container, { button: 0, clientX: 170, clientY: 150 });
    });

    expect(screen.getByTestId('graph-marquee-selection')).toBeInTheDocument();

    act(() => {
      fireEvent.mouseLeave(container);
    });

    expect(screen.queryByTestId('graph-marquee-selection')).not.toBeInTheDocument();
  });
});
