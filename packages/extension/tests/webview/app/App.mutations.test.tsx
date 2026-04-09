/**
 * Tests targeting surviving mutations in App.tsx:
 * - L27,31: ArrayDeclaration [] on useEffect deps
 * - L39: NoCoverage ObjectLiteral/ArrayDeclaration (graphData fallback)
 * - L49: OptionalChaining on filteredData?.nodes
 * - L59,60: ConditionalExpression true on panel isOpen props
 */
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_DIRECTION_COLOR } from '../../../src/shared/fileColors';
import { graphStore } from '../../../src/webview/store/state';

const harness = vi.hoisted(() => ({
  graphProps: null as null | Record<string, unknown>,
  searchBarProps: null as null | Record<string, unknown>,
  pluginsPanelProps: null as null | Record<string, unknown>,
  settingsPanelProps: null as null | Record<string, unknown>,
}));

const messageListeners: Array<(event: MessageEvent) => void> = [];

vi.mock('../../../src/webview/components/Graph', () => ({
  default: (props: Record<string, unknown>) => {
    harness.graphProps = props;
    const data = props.data as { nodes: Array<{ id: string }>; edges: Array<{ id: string }> };
    return (
      <div data-testid="mock-graph">
        <span data-testid="graph-node-count">{data.nodes.length}</span>
      </div>
    );
  },
}));

vi.mock('../../../src/webview/components/searchBar/Field', () => ({
  SearchBar: (props: Record<string, unknown>) => {
    harness.searchBarProps = props;
    return (
      <div
        data-testid="mock-search-bar"
        data-result-count={String(props.resultCount ?? '')}
        data-total-count={String(props.totalCount ?? '')}
      />
    );
  },
}));

vi.mock('../../../src/webview/components/settingsPanel/Drawer', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    harness.settingsPanelProps = { isOpen, onClose };
    return isOpen ? <button data-testid="settings-panel" onClick={onClose}>Close Settings</button> : <div data-testid="settings-panel-closed" />;
  },
}));

vi.mock('../../../src/webview/components/plugins/Panel', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    harness.pluginsPanelProps = { isOpen, onClose };
    return isOpen ? <button data-testid="plugins-panel" onClick={onClose}>Close Plugins</button> : <div data-testid="plugins-panel-closed" />;
  },
}));

vi.mock('../../../src/webview/components/Toolbar', () => ({
  default: () => <div data-testid="toolbar" />,
}));

vi.mock('../../../src/webview/pluginHost/manager', () => {
  class MockWebviewPluginHost {
    createAPI() {
      const slotContainers = new Map<string, HTMLDivElement>();
      return {
        getContainer: () => document.createElement('div'),
        getSlotContainer: (slot: string) => {
          let slotContainer = slotContainers.get(slot);
          if (!slotContainer) {
            slotContainer = document.createElement('div');
            slotContainer.setAttribute('data-plugin-slot', slot);
            slotContainers.set(slot, slotContainer);
          }
          return slotContainer;
        },
        registerNodeRenderer: () => ({ dispose() {} }),
        registerOverlay: () => ({ dispose() {} }),
        registerTooltipProvider: () => ({ dispose() {} }),
        helpers: { drawBadge() {}, drawProgressRing() {}, drawLabel() {} },
        sendMessage: () => {},
        onMessage: () => ({ dispose() {} }),
      };
    }
    attachSlotHost(_slot: string, host: HTMLDivElement) { host.style.display = 'none'; }
    detachSlotHost(_slot: string) {}
    deliverMessage() {}
  }
  return { WebviewPluginHost: MockWebviewPluginHost };
});

import App from '../../../src/webview/app/App';

vi.stubGlobal('addEventListener', (type: string, listener: (event: MessageEvent) => void) => {
  if (type === 'message') messageListeners.push(listener);
});

vi.stubGlobal('removeEventListener', (type: string, listener: (event: MessageEvent) => void) => {
  if (type === 'message') {
    const index = messageListeners.indexOf(listener);
    if (index !== -1) messageListeners.splice(index, 1);
  }
});

function resetStore(): void {
  graphStore.setState({
    graphData: null,
    isLoading: false,
    searchQuery: '',
    searchOptions: { matchCase: false, wholeWord: false, regex: false },
    favorites: new Set<string>(),
    bidirectionalMode: 'separate',
    showOrphans: true,
    directionMode: 'arrows',
    directionColor: DEFAULT_DIRECTION_COLOR,
    particleSpeed: 0.005,
    particleSize: 4,
    showLabels: true,
    graphMode: '2d',
    nodeSizeMode: 'connections',
    physicsSettings: { repelForce: 10, linkDistance: 80, linkForce: 0.15, damping: 0.7, centerForce: 0.1 },
    graphHasIndex: false,
    graphIsIndexing: false,
    graphIndexProgress: null,
    depthMode: false,
    depthLimit: 1,
    maxDepthLimit: 10,
    groups: [],
    filterPatterns: [],
    pluginFilterPatterns: [],
    pluginStatuses: [],
    graphNodeTypes: [],
    graphEdgeTypes: [],
    nodeColors: {},
    nodeVisibility: {},
    edgeVisibility: {},
    edgeColors: {},
    activePanel: 'none',
    timelineActive: false,
    nodeDecorations: {},
    edgeDecorations: {},
    maxFiles: 500,
  });
}

describe('App (mutation targets)', () => {
  beforeEach(() => {
    messageListeners.length = 0;
    delete (window as Window & { __codegraphyWebviewReadyPosted?: boolean })
      .__codegraphyWebviewReadyPosted;
    harness.graphProps = null;
    harness.searchBarProps = null;
    harness.pluginsPanelProps = null;
    harness.settingsPanelProps = null;
    resetStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders toolbar when activePanel is none', () => {
    graphStore.setState({
      graphData: { nodes: [{ id: 'a.ts', label: 'a', color: '#111' }], edges: [] },
      activePanel: 'none',
    });
    render(<App />);
    expect(screen.getByTestId('toolbar')).toBeInTheDocument();
    expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('plugins-panel')).not.toBeInTheDocument();
  });

  it('renders plugins panel alongside the toolbar when activePanel is plugins', () => {
    graphStore.setState({
      graphData: { nodes: [{ id: 'a.ts', label: 'a', color: '#111' }], edges: [] },
      activePanel: 'plugins',
    });
    render(<App />);
    expect(screen.getByTestId('plugins-panel')).toBeInTheDocument();
    expect(screen.getByTestId('toolbar')).toBeInTheDocument();
  });

  it('renders settings panel alongside the toolbar when activePanel is settings', () => {
    graphStore.setState({
      graphData: { nodes: [{ id: 'a.ts', label: 'a', color: '#111' }], edges: [] },
      activePanel: 'settings',
    });
    render(<App />);
    expect(screen.getByTestId('settings-panel')).toBeInTheDocument();
    expect(screen.getByTestId('toolbar')).toBeInTheDocument();
  });

  it('shows loading state when isLoading is true regardless of graphData', () => {
    graphStore.setState({
      isLoading: true,
      graphData: { nodes: [{ id: 'a.ts', label: 'a', color: '#111' }], edges: [] },
    });
    render(<App />);
    expect(screen.getByText('Loading graph...')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-graph')).not.toBeInTheDocument();
  });

  it('shows empty state when graph data has zero nodes even if timelineActive is true', () => {
    graphStore.setState({
      graphData: { nodes: [], edges: [] },
      timelineActive: true,
    });
    render(<App />);
    expect(screen.getByText(/No files found/)).toBeInTheDocument();
  });

  it('shows empty state when graphData is null', () => {
    graphStore.setState({
      graphData: null,
      timelineActive: false,
    });
    render(<App />);
    expect(screen.getByText(/No files found/)).toBeInTheDocument();
  });

  it('shows empty state when graphData has zero nodes', () => {
    graphStore.setState({
      graphData: { nodes: [], edges: [] },
      timelineActive: false,
    });
    render(<App />);
    expect(screen.getByText(/No files found/)).toBeInTheDocument();
  });

  it('does not render the embedded timeline component when graph data is available', () => {
    graphStore.setState({
      graphData: { nodes: [{ id: 'a.ts', label: 'a', color: '#111' }], edges: [] },
    });
    render(<App />);
    expect(screen.queryByTestId('timeline')).not.toBeInTheDocument();
  });

  it('always renders the search bar when graph data is available', () => {
    graphStore.setState({
      graphData: { nodes: [{ id: 'a.ts', label: 'a', color: '#111' }], edges: [] },
    });
    render(<App />);
    expect(screen.getByTestId('mock-search-bar')).toBeInTheDocument();
  });

  it('sets up message listener on mount and cleans up on unmount', () => {
    const { unmount } = render(<App />);
    const listenersBeforeUnmount = [...messageListeners];
    expect(listenersBeforeUnmount.length).toBeGreaterThan(0);
    unmount();
    // After unmount, the listener should be removed
    expect(messageListeners.length).toBeLessThan(listenersBeforeUnmount.length);
  });

  it('renders the outer layout with correct CSS classes', () => {
    graphStore.setState({
      graphData: { nodes: [{ id: 'a.ts', label: 'a', color: '#111' }], edges: [] },
    });
    const { container } = render(<App />);
    const outerDiv = container.firstElementChild as HTMLElement;
    expect(outerDiv.className).toContain('relative');
    expect(outerDiv.className).toContain('w-full');
    expect(outerDiv.className).toContain('h-screen');
    expect(outerDiv.className).toContain('flex');
    expect(outerDiv.className).toContain('flex-col');
  });

  it('shows hidden-files hint when graph data is empty and orphans are disabled', () => {
    graphStore.setState({
      graphData: { nodes: [], edges: [] },
      showOrphans: false,
      timelineActive: false,
    });
    render(<App />);
    expect(screen.getByText(/All files are hidden/)).toBeInTheDocument();
  });
});

describe('App panel isOpen mutations (L59-60)', () => {
  beforeEach(() => {
    messageListeners.length = 0;
    delete (window as Window & { __codegraphyWebviewReadyPosted?: boolean })
      .__codegraphyWebviewReadyPosted;
    harness.graphProps = null;
    harness.searchBarProps = null;
    harness.pluginsPanelProps = null;
    harness.settingsPanelProps = null;
    resetStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('plugins panel isOpen is false when activePanel is settings', () => {
    graphStore.setState({
      graphData: { nodes: [{ id: 'a.ts', label: 'a', color: '#111' }], edges: [] },
      activePanel: 'settings',
    });
    render(<App />);
    // Plugins panel should be present but closed
    expect(screen.getByTestId('plugins-panel-closed')).toBeInTheDocument();
    expect(screen.queryByTestId('plugins-panel')).not.toBeInTheDocument();
    // Settings panel should be open
    expect(screen.getByTestId('settings-panel')).toBeInTheDocument();
  });

  it('settings panel isOpen is false when activePanel is plugins', () => {
    graphStore.setState({
      graphData: { nodes: [{ id: 'a.ts', label: 'a', color: '#111' }], edges: [] },
      activePanel: 'plugins',
    });
    render(<App />);
    // Settings panel should be present but closed
    expect(screen.getByTestId('settings-panel-closed')).toBeInTheDocument();
    expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument();
    // Plugins panel should be open
    expect(screen.getByTestId('plugins-panel')).toBeInTheDocument();
  });

  it('closes plugins panel by setting activePanel to none', async () => {
    graphStore.setState({
      graphData: { nodes: [{ id: 'a.ts', label: 'a', color: '#111' }], edges: [] },
      activePanel: 'plugins',
    });
    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('plugins-panel'));
    });
    expect(graphStore.getState().activePanel).toBe('none');
  });

  it('closes settings panel by setting activePanel to none', async () => {
    graphStore.setState({
      graphData: { nodes: [{ id: 'a.ts', label: 'a', color: '#111' }], edges: [] },
      activePanel: 'settings',
    });
    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('settings-panel'));
    });
    expect(graphStore.getState().activePanel).toBe('none');
  });
});

describe('App effectiveGraphData and filteredData mutations (L39, L49)', () => {
  beforeEach(() => {
    messageListeners.length = 0;
    delete (window as Window & { __codegraphyWebviewReadyPosted?: boolean })
      .__codegraphyWebviewReadyPosted;
    harness.graphProps = null;
    harness.searchBarProps = null;
    resetStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes totalCount from graphData when graphData has nodes', () => {
    graphStore.setState({
      graphData: {
        nodes: [
          { id: 'a.ts', label: 'a', color: '#111' },
          { id: 'b.ts', label: 'b', color: '#222' },
        ],
        edges: [],
      },
    });
    render(<App />);
    expect(screen.getByTestId('mock-search-bar')).toHaveAttribute('data-total-count', '2');
  });

  it('passes resultCount from filteredData.nodes when search is active', () => {
    graphStore.setState({
      graphData: {
        nodes: [
          { id: 'src/App.ts', label: 'App', color: '#111' },
          { id: 'src/Todo.ts', label: 'Todo', color: '#222' },
        ],
        edges: [],
      },
      searchQuery: 'App',
    });
    render(<App />);
    expect(screen.getByTestId('mock-search-bar')).toHaveAttribute('data-result-count', '1');
  });

  it('passes resultCount equal to node count when search is blank', () => {
    graphStore.setState({
      graphData: {
        nodes: [
          { id: 'src/App.ts', label: 'App', color: '#111' },
        ],
        edges: [],
      },
      searchQuery: '',
    });
    render(<App />);
    // When search is blank, filteredData === graphData, so resultCount === node count
    const searchBar = screen.getByTestId('mock-search-bar');
    const resultCount = searchBar.getAttribute('data-result-count');
    expect(resultCount).toBe('1');
  });

  it('does not render the search bar when graphData is null', () => {
    graphStore.setState({
      graphData: null,
    });
    render(<App />);
    expect(screen.queryByTestId('mock-search-bar')).not.toBeInTheDocument();
  });
});
