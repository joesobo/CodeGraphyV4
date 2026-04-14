import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, screen, waitFor } from '@testing-library/react';
import Graph from '../../../src/webview/components/Graph';
import type { IGraphData } from '../../../src/shared/graph/types';
import { graphStore } from '../../../src/webview/store/state';
import ForceGraph2D from 'react-force-graph-2d';
import ForceGraph3D from 'react-force-graph-3d';

const graphData: IGraphData = {
  nodes: [
    { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' },
    { id: 'src/utils.ts', label: 'utils.ts', color: '#67E8F9' },
  ],
  edges: [{ id: 'src/app.ts->src/utils.ts', from: 'src/app.ts', to: 'src/utils.ts' , kind: 'import', sources: [] }],
};

function getGraphContainer(container: HTMLElement): HTMLElement {
  const graphContainer = container.querySelector('[tabindex="0"]');
  expect(graphContainer).toBeTruthy();
  return graphContainer as HTMLElement;
}

describe('Graph cursor behavior', () => {
  beforeEach(() => {
    ForceGraph2D.clearAllHandlers();
    ForceGraph3D.clearAllHandlers();
    graphStore.setState({ graphMode: '2d', timelineActive: false });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('uses pointer over nodes and default over background in 2d mode', async () => {
    const { container } = render(<Graph data={graphData} />);
    const graphContainer = getGraphContainer(container);
    const graphCanvas = screen.getByTestId('force-graph-2d') as HTMLCanvasElement;

    await act(async () => {
      ForceGraph2D.simulateNodeHover({
        id: 'src/app.ts',
        size: 16,
      });
    });

    expect(graphContainer.style.cursor).toBe('pointer');
    expect(graphCanvas.style.cursor).toBe('pointer');

    await act(async () => {
      ForceGraph2D.simulateNodeHover(null);
    });

    expect(graphContainer.style.cursor).toBe('default');
    expect(graphCanvas.style.cursor).toBe('default');
  });

  it('uses pointer over nodes and default over background in 3d mode', async () => {
    await act(async () => {
      graphStore.setState({ graphMode: '3d' });
    });

    const { container } = render(<Graph data={graphData} />);
    const graphContainer = getGraphContainer(container);
    await waitFor(() => {
      expect(screen.getByTestId('force-graph-3d')).toBeInTheDocument();
    });
    const graphSurface = screen.getByTestId('force-graph-3d') as HTMLDivElement;

    const props = ForceGraph3D.getLastProps();
    expect(typeof props.onNodeHover).toBe('function');

    await act(async () => {
      props.onNodeHover({
        id: 'src/app.ts',
        size: 16,
      });
    });

    expect(graphContainer.style.cursor).toBe('pointer');
    expect(graphSurface.style.cursor).toBe('pointer');

    await act(async () => {
      props.onNodeHover(null);
    });

    expect(graphContainer.style.cursor).toBe('default');
    expect(graphSurface.style.cursor).toBe('default');
  });
});
