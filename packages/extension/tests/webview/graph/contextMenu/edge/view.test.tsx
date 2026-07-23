import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, screen, fireEvent, waitFor } from '@testing-library/react';
import Graph from '../../../../../src/webview/components/graph/view/component';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import { graphStore } from '../../../../../src/webview/store/state';
import OwnedGraphSurface from '../../../../__mocks__/ownedGraphSurface';

import { clearSentMessages, findMessage } from '../../../../helpers/sentMessages';

function mockMacPlatform() {
  return vi.spyOn(window.navigator, 'platform', 'get').mockReturnValue('MacIntel');
}

function getGraphContainer(container: HTMLElement): HTMLElement {
  const graphContainer = container.querySelector('[tabindex="0"]');
  expect(graphContainer).toBeTruthy();
  return graphContainer as HTMLElement;
}

const menuData: IGraphData = {
  nodes: [
    { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' },
    { id: 'src/utils.ts', label: 'utils.ts', color: '#67E8F9' },
  ],
  edges: [{ id: 'src/app.ts->src/utils.ts', from: 'src/app.ts', to: 'src/utils.ts' , kind: 'import', sources: [] }],
};

const edge = {
  id: 'src/app.ts->src/utils.ts',
  from: 'src/app.ts',
  to: 'src/utils.ts',
};

describe('Graph context menu (edge)', () => {
  beforeEach(() => {
    clearSentMessages();
    OwnedGraphSurface.clearAllHandlers();
    graphStore.setState({
      favorites: new Set<string>(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    act(() => {
      graphStore.setState({
        favorites: new Set<string>(),
      });
    });
  });

  it('opens edge menu in 2d from onLinkRightClick alone', async () => {
    render(<Graph data={menuData} />);

    await act(async () => {
      OwnedGraphSurface.simulateLinkRightClick(edge);
    });

    await waitFor(() => {
      expect(screen.getByText('Open Source')).toBeInTheDocument();
    });
    expect(screen.getByText('Open Target')).toBeInTheDocument();
    expect(screen.getByText('Copy Source Path')).toBeInTheDocument();
    expect(screen.getByText('Copy Target Path')).toBeInTheDocument();
    expect(screen.getByText('Copy Both Paths')).toBeInTheDocument();
  });

  it('shows edge menu items from mac ctrl+click in 2d (same as right-click)', async () => {
    const platformSpy = mockMacPlatform();
    try {
      render(<Graph data={menuData} />);

      await act(async () => {
        OwnedGraphSurface.simulateLinkClick(edge, { button: 0, ctrlKey: true, clientX: 210, clientY: 180 });
      });

      await waitFor(() => {
        expect(screen.getByText('Open Source')).toBeInTheDocument();
      });
      expect(screen.getByText('Open Target')).toBeInTheDocument();
      expect(screen.getByText('Copy Source Path')).toBeInTheDocument();
      expect(screen.getByText('Copy Target Path')).toBeInTheDocument();
      expect(screen.getByText('Copy Both Paths')).toBeInTheDocument();
    } finally {
      platformSpy.mockRestore();
    }
  });

  it('shows only edge actions when right-clicking an edge', async () => {
    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      OwnedGraphSurface.simulateLinkRightClick(edge);
      fireEvent.contextMenu(graphContainer, { clientX: 180, clientY: 160 });
    });

    await waitFor(() => {
      expect(screen.getByText('Open Source')).toBeInTheDocument();
    });
    expect(screen.getByText('Open Target')).toBeInTheDocument();
    expect(screen.getByText('Copy Source Path')).toBeInTheDocument();
    expect(screen.getByText('Copy Target Path')).toBeInTheDocument();
    expect(screen.getByText('Copy Both Paths')).toBeInTheDocument();
    expect(screen.queryByText('Open File')).not.toBeInTheDocument();
    expect(screen.queryByText('New File')).not.toBeInTheDocument();
  });


  it('sends OPEN_FILE source path when clicking Open Source', async () => {
    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      OwnedGraphSurface.simulateLinkRightClick(edge);
      fireEvent.contextMenu(graphContainer, { clientX: 200, clientY: 180 });
    });

    await waitFor(() => {
      expect(screen.getByText('Open Source')).toBeInTheDocument();
    });

    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Open Source'));
    });

    const openMsg = findMessage('OPEN_FILE');
    expect(openMsg).toBeTruthy();
    expect(openMsg!.payload.path).toBe('src/app.ts');
  });

  it('sends OPEN_FILE target path when clicking Open Target', async () => {
    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      OwnedGraphSurface.simulateLinkRightClick(edge);
      fireEvent.contextMenu(graphContainer, { clientX: 200, clientY: 180 });
    });

    await waitFor(() => {
      expect(screen.getByText('Open Target')).toBeInTheDocument();
    });

    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Open Target'));
    });

    const openMsg = findMessage('OPEN_FILE');
    expect(openMsg).toBeTruthy();
    expect(openMsg!.payload.path).toBe('src/utils.ts');
  });

  it('sends COPY_TO_CLIPBOARD source path when clicking Copy Source Path', async () => {
    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      OwnedGraphSurface.simulateLinkRightClick(edge);
      fireEvent.contextMenu(graphContainer, { clientX: 200, clientY: 180 });
    });

    await waitFor(() => {
      expect(screen.getByText('Copy Source Path')).toBeInTheDocument();
    });

    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Copy Source Path'));
    });

    const copyMsg = findMessage('COPY_TO_CLIPBOARD');
    expect(copyMsg).toBeTruthy();
    expect(copyMsg!.payload.text).toBe('src/app.ts');
  });

  it('sends COPY_TO_CLIPBOARD target path when clicking Copy Target Path', async () => {
    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      OwnedGraphSurface.simulateLinkRightClick(edge);
      fireEvent.contextMenu(graphContainer, { clientX: 200, clientY: 180 });
    });

    await waitFor(() => {
      expect(screen.getByText('Copy Target Path')).toBeInTheDocument();
    });

    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Copy Target Path'));
    });

    const copyMsg = findMessage('COPY_TO_CLIPBOARD');
    expect(copyMsg).toBeTruthy();
    expect(copyMsg!.payload.text).toBe('src/utils.ts');
  });

  it('sends COPY_TO_CLIPBOARD both paths when clicking Copy Both Paths', async () => {
    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      OwnedGraphSurface.simulateLinkRightClick(edge);
      fireEvent.contextMenu(graphContainer, { clientX: 200, clientY: 180 });
    });

    await waitFor(() => {
      expect(screen.getByText('Copy Both Paths')).toBeInTheDocument();
    });

    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Copy Both Paths'));
    });

    const copyMsg = findMessage('COPY_TO_CLIPBOARD');
    expect(copyMsg).toBeTruthy();
    expect(copyMsg!.payload.text).toBe('src/app.ts\nsrc/utils.ts');
  });

});
