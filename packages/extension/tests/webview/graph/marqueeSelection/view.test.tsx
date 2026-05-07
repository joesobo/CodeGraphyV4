import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ForceGraph2D from 'react-force-graph-2d';
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
    graphMode: '2d',
    ...overrides,
  });
}

describe('graph/marqueeSelection view', () => {
  beforeEach(() => {
    ForceGraph2D.clearAllHandlers();
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
      ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts' });
    });

    expect(await screen.findByText('Open 2 Files')).toBeInTheDocument();
  });

  it('adds Shift-left-drag marquee hits to the existing selection', async () => {
    render(<Graph data={graphData} />);
    const container = document.querySelector('.graph-container') as HTMLElement;

    act(() => {
      ForceGraph2D.simulateNodeClick({ id: 'README.md' }, { shiftKey: true });
      fireEvent.mouseDown(container, { button: 0, shiftKey: true, clientX: 90, clientY: 90 });
      fireEvent.mouseMove(container, { button: 0, shiftKey: true, clientX: 170, clientY: 150 });
    });

    expect(screen.getByTestId('graph-marquee-selection')).toBeInTheDocument();

    act(() => {
      fireEvent.mouseUp(container, { button: 0, shiftKey: true, clientX: 170, clientY: 150 });
    });

    act(() => {
      ForceGraph2D.simulateNodeRightClick({ id: 'README.md' });
    });

    expect(await screen.findByText('Open 3 Files')).toBeInTheDocument();
  });

  it.each([
    { button: 2, label: 'right' },
    { button: 1, label: 'middle' },
  ])('pans the graph with $label-click drag', ({ button }) => {
    const graphMethods = ForceGraph2D.getMockMethods();
    graphMethods.screen2GraphCoords.mockImplementationOnce(() => ({ x: 5, y: 10 }));
    graphMethods.zoom.mockReturnValue(2);

    render(<Graph data={graphData} />);
    const container = document.querySelector('.graph-container') as HTMLElement;

    act(() => {
      fireEvent.mouseDown(container, { button, clientX: 100, clientY: 100 });
      fireEvent.mouseMove(container, { clientX: 120, clientY: 130 });
    });

    expect(graphMethods.centerAt).toHaveBeenCalledWith(-5, -5, 0);

    act(() => {
      fireEvent.mouseUp(container, { button, clientX: 120, clientY: 130 });
    });

    expect(screen.queryByTestId('graph-marquee-selection')).not.toBeInTheDocument();
  });

  it('does not open the context menu after a right-click drag that pans below the old fallback threshold', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-07T12:00:00Z'));
    const graphMethods = ForceGraph2D.getMockMethods();
    graphMethods.screen2GraphCoords.mockImplementationOnce(() => ({ x: 0, y: 0 }));
    graphMethods.zoom.mockReturnValue(1);

    try {
      render(<Graph data={graphData} />);
      const container = document.querySelector('.graph-container') as HTMLElement;

      act(() => {
        fireEvent.mouseDown(container, { button: 2, clientX: 100, clientY: 100 });
        fireEvent.mouseMove(container, { button: 2, clientX: 103, clientY: 100 });
        fireEvent.mouseUp(container, { button: 2, clientX: 103, clientY: 100 });
      });

      expect(graphMethods.centerAt).toHaveBeenCalledWith(-3, 0, 0);

      act(() => {
        vi.advanceTimersByTime(120);
      });

      expect(screen.queryByText('New Graph Section')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
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
