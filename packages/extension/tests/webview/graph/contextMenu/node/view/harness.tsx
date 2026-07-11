import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ForceGraph2D from 'react-force-graph-2d';
import { afterEach, beforeEach, expect, vi } from 'vitest';
import type { IGraphData } from '../../../../../../src/shared/graph/contracts';
import Graph from '../../../../../../src/webview/components/graph/view/component';
import { graphStore } from '../../../../../../src/webview/store/state';
import {
  clearSentMessages,
  findMessage,
  getSentMessages,
} from '../../../../../helpers/sentMessages';

export { act, fireEvent, render, screen, waitFor };
export { ForceGraph2D };
export { clearSentMessages, findMessage, getSentMessages };
export { Graph, graphStore };

export const menuData: IGraphData = {
  nodes: [
    { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD', x: 12, y: -24 },
    { id: 'src/utils.ts', label: 'utils.ts', color: '#67E8F9', x: 72, y: 36 },
  ],
  edges: [
    {
      id: 'src/app.ts->src/utils.ts',
      from: 'src/app.ts',
      to: 'src/utils.ts',
      kind: 'import',
      sources: [],
    },
  ],
};

export const selectionData: IGraphData = {
  nodes: [
    { id: 'nodeA.ts', label: 'nodeA.ts', color: '#93C5FD', x: 10, y: 20 },
    { id: 'nodeB.ts', label: 'nodeB.ts', color: '#67E8F9', x: 40, y: 60 },
  ],
  edges: [],
};

export const folderData: IGraphData = {
  nodes: [
    { id: 'src', label: 'src', color: '#94a3b8', nodeType: 'folder' },
    { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' },
  ],
  edges: [],
};

export const symbolData: IGraphData = {
  nodes: [
    { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD', nodeType: 'file' },
    {
      id: 'src/app.ts#start:function',
      label: 'start',
      color: '#8B5CF6',
      nodeType: 'symbol',
      symbol: {
        id: 'src/app.ts#start:function',
        name: 'start',
        kind: 'function',
        filePath: 'src/app.ts',
      },
    },
  ],
  edges: [],
};

export function setupGraphContextMenuTest(): void {
  beforeEach(() => {
    clearSentMessages();
    ForceGraph2D.clearAllHandlers();
    graphStore.setState({
      favorites: new Set<string>(),
      timelineActive: false,
      pluginContextMenuItems: [],
      graphViewContributionStatuses: [],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    ForceGraph2D.clearMockPositions();
    act(() => {
      graphStore.setState({
        favorites: new Set<string>(),
        timelineActive: false,
        pluginContextMenuItems: [],
        graphViewContributionStatuses: [],
      });
    });
  });
}

export function mockMacPlatform(): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(window.navigator, 'platform', 'get').mockReturnValue('MacIntel');
}

export function getGraphContainer(container: HTMLElement): HTMLElement {
  const graphContainer = container.querySelector('[tabindex="0"]');
  expect(graphContainer).toBeTruthy();
  return graphContainer as HTMLElement;
}

export async function openNodeMenu(
  data: IGraphData = menuData,
  nodeId = 'src/app.ts',
): Promise<HTMLElement> {
  const { container } = render(<Graph data={data} />);
  const graphContainer = getGraphContainer(container);

  await act(async () => {
    ForceGraph2D.simulateNodeRightClick({ id: nodeId });
    fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
  });

  return graphContainer;
}

export async function selectTwoNodesForMultiMenu(graphContainer: HTMLElement): Promise<void> {
  await act(async () => {
    ForceGraph2D.simulateNodeClick({ id: 'nodeA.ts' });
    ForceGraph2D.simulateNodeClick({ id: 'nodeB.ts' }, { button: 0, ctrlKey: true });
  });

  await act(async () => {
    ForceGraph2D.simulateNodeRightClick({ id: 'nodeA.ts' });
    fireEvent.contextMenu(graphContainer, { clientX: 180, clientY: 160 });
  });
}
