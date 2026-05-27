import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ForceGraph2D from 'react-force-graph-2d';
import ForceGraph3D from 'react-force-graph-3d';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import Graph from '../../../../src/webview/components/graph/view/component';
import { graphStore } from '../../../../src/webview/store/state';

import { clearSentMessages, findMessage } from '../../../helpers/sentMessages';

function getGraphContainer(container: HTMLElement): HTMLElement {
  const graphContainer = container.querySelector('[tabindex="0"]');
  expect(graphContainer).toBeTruthy();
  return graphContainer as HTMLElement;
}

const menuData: IGraphData = {
  nodes: [
    { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD', x: 12, y: -24 },
    { id: 'src/utils.ts', label: 'utils.ts', color: '#67E8F9', x: 72, y: 36 },
  ],
  edges: [{ id: 'src/app.ts->src/utils.ts', from: 'src/app.ts', to: 'src/utils.ts' , kind: 'import', sources: [] }],
};

const folderData: IGraphData = {
  nodes: [
    { id: 'src', label: 'src', color: '#94a3b8', nodeType: 'folder' },
    { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' },
  ],
  edges: [],
};

const symbolData: IGraphData = {
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

describe('Graph context menu (node)', () => {



    beforeEach(() => {
      clearSentMessages();
      ForceGraph2D.clearAllHandlers();
      ForceGraph3D.clearAllHandlers();
      graphStore.setState({
        favorites: new Set<string>(),
        graphMode: '2d',
        timelineActive: false,
        pluginContextMenuItems: [],
      });
    });



    afterEach(() => {
      vi.clearAllMocks();
      ForceGraph2D.clearMockPositions();
      act(() => {
        graphStore.setState({
          favorites: new Set<string>(),
          graphMode: '2d',
          timelineActive: false,
          pluginContextMenuItems: [],
        });
      });
    });



    it('sends RENAME_FILE message when clicking Rename...', async () => {
      const { container } = render(<Graph data={menuData} />);
      const graphContainer = getGraphContainer(container);

      await act(async () => {
        ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts' });
        fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
      });

      await waitFor(() => {
        expect(screen.getByText('Rename...')).toBeInTheDocument();
      });

      clearSentMessages();
      await act(async () => {
        fireEvent.click(screen.getByText('Rename...'));
      });

      const renameMsg = findMessage('RENAME_FILE');
      expect(renameMsg).toBeTruthy();
      expect(renameMsg!.payload.path).toBe('src/app.ts');
    });



    it('sends TOGGLE_FAVORITE message when clicking favorite action', async () => {
      const { container } = render(<Graph data={menuData} />);
      const graphContainer = getGraphContainer(container);

      await act(async () => {
        ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts' });
        fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
      });

      await waitFor(() => {
        expect(screen.getByText('Add to Favorites')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Add to Favorites'));
      });

      const favMsg = findMessage('TOGGLE_FAVORITE');
      expect(favMsg).toBeTruthy();
      expect(favMsg!.payload.paths).toContain('src/app.ts');
    });



    it('shows symbol-specific node menu actions', async () => {
      const { container } = render(<Graph data={symbolData} />);
      const graphContainer = getGraphContainer(container);

      await act(async () => {
        ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts#start:function' });
        fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
      });

      await waitFor(() => {
        expect(screen.getByText('Go to Symbol')).toBeInTheDocument();
      });

      expect(screen.getByText('Reveal File')).toBeInTheDocument();
      expect(screen.getByText('Copy Symbol ID')).toBeInTheDocument();
      expect(screen.getByText('Copy Symbol Name')).toBeInTheDocument();
      expect(screen.getByText('Add to Favorites')).toBeInTheDocument();
      expect(screen.getAllByText('Focus Node')).toHaveLength(1);
      expect(screen.queryByText('Open File')).not.toBeInTheDocument();
      expect(screen.queryByText('Rename...')).not.toBeInTheDocument();
      expect(screen.queryByText('Delete File')).not.toBeInTheDocument();
    });



    it('sends symbol context menu actions with symbol identity and containing file', async () => {
      const { container } = render(<Graph data={symbolData} />);
      const graphContainer = getGraphContainer(container);

      await act(async () => {
        ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts#start:function' });
        fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
      });

      await waitFor(() => {
        expect(screen.getByText('Go to Symbol')).toBeInTheDocument();
      });

      clearSentMessages();
      await act(async () => {
        fireEvent.click(screen.getByText('Go to Symbol'));
      });
      expect(findMessage('OPEN_FILE')?.payload.path).toBe('src/app.ts#start:function');

      await act(async () => {
        ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts#start:function' });
        fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
      });
      await waitFor(() => {
        expect(screen.getByText('Copy Symbol Name')).toBeInTheDocument();
      });
      clearSentMessages();
      await act(async () => {
        fireEvent.click(screen.getByText('Copy Symbol Name'));
      });
      expect(findMessage('COPY_TO_CLIPBOARD')?.payload.text).toBe('start');

      await act(async () => {
        ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts#start:function' });
        fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
      });
      await waitFor(() => {
        expect(screen.getByText('Copy Symbol ID')).toBeInTheDocument();
      });
      clearSentMessages();
      await act(async () => {
        fireEvent.click(screen.getByText('Copy Symbol ID'));
      });
      expect(findMessage('COPY_TO_CLIPBOARD')?.payload.text).toBe('src/app.ts#start:function');

      await act(async () => {
        ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts#start:function' });
        fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
      });
      await waitFor(() => {
        expect(screen.getByText('Add to Favorites')).toBeInTheDocument();
      });
      clearSentMessages();
      await act(async () => {
        fireEvent.click(screen.getByText('Add to Favorites'));
      });
      expect(findMessage('TOGGLE_FAVORITE')?.payload.paths).toEqual(['src/app.ts#start:function']);
    });



    it('sends DELETE_FILES message when clicking Delete File', async () => {
      const { container } = render(<Graph data={menuData} />);
      const graphContainer = getGraphContainer(container);

      await act(async () => {
        ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts' });
        fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
      });

      await waitFor(() => {
        expect(screen.getByText('Delete File')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Delete File'));
      });

      const deleteMsg = findMessage('DELETE_FILES');
      expect(deleteMsg).toBeTruthy();
      expect(deleteMsg!.payload.paths).toContain('src/app.ts');
    });



    it('shows folder parity actions when right-clicking a folder node', async () => {
      const { container } = render(<Graph data={folderData} />);
      const graphContainer = getGraphContainer(container);

      await act(async () => {
        ForceGraph2D.simulateNodeRightClick({ id: 'src' });
        fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
      });

      await waitFor(() => {
        expect(screen.getByText('New Folder...')).toBeInTheDocument();
      });

      expect(screen.getByText('New File...')).toBeInTheDocument();
      expect(screen.getByText('Reveal in Explorer')).toBeInTheDocument();
      expect(screen.getByText('Copy Relative Path')).toBeInTheDocument();
      expect(screen.getByText('Copy Absolute Path')).toBeInTheDocument();
      expect(screen.getByText('Rename Folder...')).toBeInTheDocument();
      expect(screen.getByText('Delete Folder')).toBeInTheDocument();
      expect(screen.queryByText('Open File')).not.toBeInTheDocument();
    });



    it('sends RENAME_FILE message when clicking Rename Folder...', async () => {
      const { container } = render(<Graph data={folderData} />);
      const graphContainer = getGraphContainer(container);

      await act(async () => {
        ForceGraph2D.simulateNodeRightClick({ id: 'src' });
        fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
      });

      await waitFor(() => {
        expect(screen.getByText('Rename Folder...')).toBeInTheDocument();
      });

      clearSentMessages();
      await act(async () => {
        fireEvent.click(screen.getByText('Rename Folder...'));
      });

      const renameMsg = findMessage('RENAME_FILE');
      expect(renameMsg).toBeTruthy();
      expect(renameMsg!.payload.path).toBe('src');
    });
});
