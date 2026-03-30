import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import Graph from '../../../src/webview/components/Graph';
import type { IGraphData } from '../../../src/shared/graph/types';
import { graphStore } from '../../../src/webview/store/state';
import ForceGraph2D from 'react-force-graph-2d';
import ForceGraph3D from 'react-force-graph-3d';

import { clearSentMessages, findMessage, getSentMessages } from '../../helpers/sentMessages';

const graphData: IGraphData = {
  nodes: [
    { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' },
    { id: 'src/utils.ts', label: 'utils.ts', color: '#67E8F9' },
  ],
  edges: [{ id: 'src/app.ts->src/utils.ts', from: 'src/app.ts', to: 'src/utils.ts' }],
};

describe('Graph double-click behavior', () => {
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

  it('focuses and opens node in 2d on double-click', async () => {
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
    const selectMsg = findMessage('NODE_SELECTED');
    expect(selectMsg).toBeTruthy();
    expect(selectMsg!.payload.nodeId).toBe('src/app.ts');
    const openMsg = findMessage('NODE_DOUBLE_CLICKED');
    expect(openMsg).toBeTruthy();
    expect(openMsg!.payload.nodeId).toBe('src/app.ts');

    const nodeDoubleClickInteraction = getSentMessages().find(
      msg => msg.type === 'GRAPH_INTERACTION' && msg.payload.event === 'graph:nodeDoubleClick'
    );
    expect(nodeDoubleClickInteraction).toBeTruthy();
  });

  it('focuses and opens node in 3d on double-click', async () => {
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
    const openMsg = findMessage('NODE_DOUBLE_CLICKED');
    expect(openMsg).toBeTruthy();
    expect(openMsg!.payload.nodeId).toBe('src/app.ts');

    const nodeDoubleClickInteraction = getSentMessages().find(
      msg => msg.type === 'GRAPH_INTERACTION' && msg.payload.event === 'graph:nodeDoubleClick'
    );
    expect(nodeDoubleClickInteraction).toBeTruthy();
  });

  it('selects and preview-opens on single click without focus animation', async () => {
    const methods = ForceGraph2D.getMockMethods();
    methods.centerAt.mockClear();
    methods.zoom.mockClear();

    render(<Graph data={graphData} />);

    await act(async () => {
      ForceGraph2D.simulateNodeClick({ id: 'src/app.ts' }, { button: 0, clientX: 100, clientY: 100 });
    });

    expect(methods.centerAt).not.toHaveBeenCalled();
    expect(methods.zoom).not.toHaveBeenCalled();
    const selectMsg = findMessage('NODE_SELECTED');
    expect(selectMsg).toBeTruthy();
    expect(selectMsg!.payload.nodeId).toBe('src/app.ts');
    expect(findMessage('NODE_DOUBLE_CLICKED')).toBeUndefined();
  });

  it('does not open files on modifier multi-select clicks', async () => {
    render(<Graph data={graphData} />);

    await act(async () => {
      ForceGraph2D.simulateNodeClick({ id: 'src/app.ts' }, { button: 0, ctrlKey: true, clientX: 100, clientY: 100 });
    });

    expect(findMessage('NODE_SELECTED')).toBeUndefined();
    expect(findMessage('NODE_DOUBLE_CLICKED')).toBeUndefined();
  });

  it('keeps the same node selected across repeated single clicks', async () => {
    vi.useFakeTimers();
    try {
      const methods = ForceGraph2D.getMockMethods();
      methods.centerAt.mockClear();
      methods.zoom.mockClear();

      render(<Graph data={graphData} />);

      await act(async () => {
        ForceGraph2D.simulateNodeClick({ id: 'src/app.ts' }, { button: 0, clientX: 100, clientY: 100 });
        vi.advanceTimersByTime(600);
        ForceGraph2D.simulateNodeClick({ id: 'src/app.ts' }, { button: 0, clientX: 100, clientY: 100 });
      });

      const selectedMessages = getSentMessages().filter(
        msg => msg.type === 'NODE_SELECTED' && msg.payload.nodeId === 'src/app.ts'
      );
      expect(selectedMessages).toHaveLength(2);
      expect(methods.centerAt).not.toHaveBeenCalled();
      expect(methods.zoom).not.toHaveBeenCalled();
      expect(findMessage('NODE_DOUBLE_CLICKED')).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not treat rapid clicks on different nodes as a double-click', async () => {
    const methods = ForceGraph2D.getMockMethods();
    methods.centerAt.mockClear();
    methods.zoom.mockClear();

    render(<Graph data={graphData} />);

    await act(async () => {
      ForceGraph2D.simulateNodeClick({ id: 'src/app.ts' }, { button: 0, clientX: 100, clientY: 100 });
      ForceGraph2D.simulateNodeClick({ id: 'src/utils.ts' }, { button: 0, clientX: 140, clientY: 120 });
    });

    expect(methods.centerAt).not.toHaveBeenCalled();
    expect(methods.zoom).not.toHaveBeenCalled();
    expect(findMessage('NODE_DOUBLE_CLICKED')).toBeUndefined();
  });

  it('still focuses and posts open request in timeline mode', async () => {
    const methods = ForceGraph2D.getMockMethods();
    methods.centerAt.mockClear();
    methods.zoom.mockClear();
    graphStore.setState({ timelineActive: true });

    render(<Graph data={graphData} />);

    await act(async () => {
      ForceGraph2D.simulateNodeClick({ id: 'src/app.ts' }, { button: 0, clientX: 100, clientY: 100 });
      ForceGraph2D.simulateNodeClick({ id: 'src/app.ts' }, { button: 0, clientX: 100, clientY: 100 });
    });

    expect(methods.centerAt).toHaveBeenCalledWith(0, 0, 300);
    expect(methods.zoom).toHaveBeenCalledWith(1.5, 300);
    const openMsg = findMessage('NODE_DOUBLE_CLICKED');
    expect(openMsg).toBeTruthy();
    expect(openMsg!.payload.nodeId).toBe('src/app.ts');
  });
});
