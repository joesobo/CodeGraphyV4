import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import Graph from '../../src/webview/components/Graph';
import { IGraphData } from '../../src/shared/types';
import { graphStore } from '../../src/webview/store';
import ForceGraph2D from 'react-force-graph-2d';
import ForceGraph3D from 'react-force-graph-3d';

import { clearSentMessages, findMessage, getSentMessages } from '../helpers/sentMessages';

const graphData: IGraphData = {
  nodes: [
    { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' },
    { id: 'src/utils.ts', label: 'utils.ts', color: '#67E8F9' },
  ],
  edges: [{ id: 'src/app.ts->src/utils.ts', from: 'src/app.ts', to: 'src/utils.ts' }],
};

describe('Graph double-click focus', () => {
  beforeEach(() => {
    clearSentMessages();
    ForceGraph2D.clearAllHandlers();
    ForceGraph3D.clearAllHandlers();
    graphStore.setState({
      graphMode: '2d',
      timelineActive: false,
      favorites: new Set<string>(),
      pluginContextMenuItems: [],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('focuses node in 2d on double-click and does not post NODE_DOUBLE_CLICKED', async () => {
    const methods = ForceGraph2D.getMockMethods();
    methods.centerAt.mockClear();
    methods.zoom.mockClear();

    render(<Graph data={graphData} />);

    await act(async () => {
      ForceGraph2D.simulateNodeClick({ id: 'src/app.ts' }, { button: 0, clientX: 100, clientY: 100 });
      ForceGraph2D.simulateNodeClick({ id: 'src/app.ts' }, { button: 0, clientX: 100, clientY: 100 });
    });

    expect(methods.centerAt).toHaveBeenCalledWith(0, 0, 300);
    expect(methods.zoom).toHaveBeenCalledWith(1.5, 300);
    expect(findMessage('NODE_DOUBLE_CLICKED')).toBeUndefined();

    const nodeDoubleClickInteraction = getSentMessages().find(
      msg => msg.type === 'GRAPH_INTERACTION' && msg.payload.event === 'graph:nodeDoubleClick'
    );
    expect(nodeDoubleClickInteraction).toBeTruthy();
  });

  it('focuses node in 3d on double-click and does not post NODE_DOUBLE_CLICKED', async () => {
    await act(async () => {
      graphStore.setState({ graphMode: '3d' });
    });

    const methods = ForceGraph3D.getMockMethods();
    methods.zoomToFit.mockClear();

    render(<Graph data={graphData} />);

    await act(async () => {
      ForceGraph3D.simulateNodeClick({ id: 'src/app.ts' }, { button: 0, clientX: 120, clientY: 120 });
      ForceGraph3D.simulateNodeClick({ id: 'src/app.ts' }, { button: 0, clientX: 120, clientY: 120 });
    });

    expect(methods.zoomToFit).toHaveBeenCalledWith(300, 20, expect.any(Function));
    expect(findMessage('NODE_DOUBLE_CLICKED')).toBeUndefined();

    const nodeDoubleClickInteraction = getSentMessages().find(
      msg => msg.type === 'GRAPH_INTERACTION' && msg.payload.event === 'graph:nodeDoubleClick'
    );
    expect(nodeDoubleClickInteraction).toBeTruthy();
  });
});
