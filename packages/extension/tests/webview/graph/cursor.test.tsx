import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, screen } from '@testing-library/react';
import Graph from '../../../src/webview/components/graph/view/component';
import type { IGraphData } from '../../../src/shared/graph/contracts';
import ForceGraph2D from '../../__mocks__/ownedGraphSurface';

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
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('uses pointer over nodes and default over background in 2d mode', async () => {
    const { container } = render(<Graph data={graphData} />);
    const graphContainer = getGraphContainer(container);
    const graphCanvas = screen.getByTestId('owned-webgpu-graph') as HTMLCanvasElement;

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

});
