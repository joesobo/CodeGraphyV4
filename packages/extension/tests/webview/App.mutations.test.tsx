/**
 * Tests targeting surviving mutations in App.tsx:
 * - ArrayDeclaration [] on useEffect deps
 * - OptionalChaining on graphData?.nodes.length
 * - ConditionalExpression on activePanel !== 'none'
 * - ConditionalExpression on timelineActive
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_DIRECTION_COLOR } from '../../src/shared/types';
import { graphStore } from '../../src/webview/store';

const harness = vi.hoisted(() => ({
  graphProps: null as null | Record<string, unknown>,
  searchBarProps: null as null | Record<string, unknown>,
}));

const messageListeners: Array<(event: MessageEvent) => void> = [];

vi.mock('../../src/webview/components/Graph', () => ({
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

vi.mock('../../src/webview/components/SearchBar', () => ({
  SearchBar: (props: Record<string, unknown>) => {
    harness.searchBarProps = props;
    return <div data-testid="mock-search-bar" />;
  },
}));

vi.mock('../../src/webview/components/settingsPanel/Panel', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? <button data-testid="settings-panel" onClick={onClose}>Close Settings</button> : null,
}));

vi.mock('../../src/webview/components/PluginsPanel', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? <button data-testid="plugins-panel" onClick={onClose}>Close Plugins</button> : null,
}));

vi.mock('../../src/webview/components/Timeline', () => ({
  default: () => <div data-testid="timeline" />,
}));

vi.mock('../../src/webview/components/Toolbar', () => ({
  default: () => <div data-testid="toolbar" />,
}));

vi.mock('../../src/webview/pluginHost/webviewPluginHost', () => {
  class MockWebviewPluginHost {
    createAPI() {
      return {
        getContainer: () => document.createElement('div'),
        registerNodeRenderer: () => ({ dispose() {} }),
        registerOverlay: () => ({ dispose() {} }),
        registerTooltipProvider: () => ({ dispose() {} }),
        helpers: { drawBadge() {}, drawProgressRing() {}, drawLabel() {} },
        sendMessage: () => {},
        onMessage: () => ({ dispose() {} }),
      };
    }
    deliverMessage() {}
  }
  return { WebviewPluginHost: MockWebviewPluginHost };
});

import App from '../../src/webview/App';

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
    depthLimit: 1,
    groups: [],
    filterPatterns: [],
    pluginFilterPatterns: [],
    availableViews: [],
    activeViewId: 'codegraphy.connections',
    pluginStatuses: [],
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
    harness.graphProps = null;
    harness.searchBarProps = null;
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

  it('renders panels instead of toolbar when activePanel is plugins', () => {
    graphStore.setState({
      graphData: { nodes: [{ id: 'a.ts', label: 'a', color: '#111' }], edges: [] },
      activePanel: 'plugins',
    });
    render(<App />);
    expect(screen.getByTestId('plugins-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('toolbar')).not.toBeInTheDocument();
  });

  it('renders panels instead of toolbar when activePanel is settings', () => {
    graphStore.setState({
      graphData: { nodes: [{ id: 'a.ts', label: 'a', color: '#111' }], edges: [] },
      activePanel: 'settings',
    });
    render(<App />);
    expect(screen.getByTestId('settings-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('toolbar')).not.toBeInTheDocument();
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

  it('shows graph when timelineActive is true even with empty graph data', () => {
    graphStore.setState({
      graphData: { nodes: [], edges: [] },
      timelineActive: true,
    });
    render(<App />);
    expect(screen.getByTestId('mock-graph')).toBeInTheDocument();
  });

  it('shows empty state when timelineActive is false and graphData is null', () => {
    graphStore.setState({
      graphData: null,
      timelineActive: false,
    });
    render(<App />);
    expect(screen.getByText(/No files found/)).toBeInTheDocument();
  });

  it('shows empty state when timelineActive is false and graphData has zero nodes', () => {
    graphStore.setState({
      graphData: { nodes: [], edges: [] },
      timelineActive: false,
    });
    render(<App />);
    expect(screen.getByText(/No files found/)).toBeInTheDocument();
  });

  it('renders graph with effectiveGraphData when graphData is null and timeline is active', () => {
    graphStore.setState({
      graphData: null,
      timelineActive: true,
    });
    render(<App />);
    // effectiveGraphData should be { nodes: [], edges: [] }
    expect(screen.getByTestId('graph-node-count')).toHaveTextContent('0');
  });

  it('always renders the timeline component when graph data is available', () => {
    graphStore.setState({
      graphData: { nodes: [{ id: 'a.ts', label: 'a', color: '#111' }], edges: [] },
    });
    render(<App />);
    expect(screen.getByTestId('timeline')).toBeInTheDocument();
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
