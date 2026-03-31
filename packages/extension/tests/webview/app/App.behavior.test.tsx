import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_DIRECTION_COLOR } from '../../../src/shared/fileColors';
import { graphStore } from '../../../src/webview/store/state';

const harness = vi.hoisted(() => ({
  graphProps: null as null | Record<string, unknown>,
  graphRenderCount: 0,
  searchBarProps: null as null | Record<string, unknown>,
  createApiCalls: [] as string[],
  deliveries: [] as Array<{ pluginId: string; message: { type: string; data: unknown } }>,
}));

const messageListeners: Array<(event: MessageEvent) => void> = [];

vi.mock('../../../src/webview/components/Graph', () => ({
  default: (props: Record<string, unknown>) => {
    harness.graphRenderCount += 1;
    harness.graphProps = props;
    const data = props.data as { nodes: Array<{ id: string; color?: string; shape2D?: string; shape3D?: string; imageUrl?: string }>; edges: Array<{ id: string }> };
    return (
      <div data-testid="mock-graph">
        <span data-testid="graph-node-ids">{data.nodes.map((node) => node.id).join(',')}</span>
        <span data-testid="graph-node-colors">{data.nodes.map((node) => node.color ?? '').join(',')}</span>
        <span data-testid="graph-node-shapes">{data.nodes.map((node) => `${node.shape2D ?? 'none'}:${node.shape3D ?? 'none'}`).join(',')}</span>
        <span data-testid="graph-node-images">{data.nodes.map((node) => node.imageUrl ?? '').join(',')}</span>
        <span data-testid="graph-edge-ids">{data.edges.map((edge) => edge.id).join(',')}</span>
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
        data-regex-error={String(props.regexError ?? '')}
        data-result-count={String(props.resultCount ?? '')}
        data-total-count={String(props.totalCount ?? '')}
      />
    );
  },
}));

vi.mock('../../../src/webview/components/settingsPanel/Drawer', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? <button data-testid="settings-panel" onClick={onClose}>Close Settings</button> : null,
}));

vi.mock('../../../src/webview/components/plugins/Panel', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? <button data-testid="plugins-panel" onClick={onClose}>Close Plugins</button> : null,
}));

vi.mock('../../../src/webview/components/Timeline', () => ({
  default: () => <div data-testid="timeline" />,
}));

vi.mock('../../../src/webview/components/Toolbar', () => ({
  default: () => <div data-testid="toolbar" />,
}));

vi.mock('../../../src/webview/pluginHost/manager', () => {
  class MockWebviewPluginHost {
    createAPI(pluginId: string, postMessage: (message: { type: 'GRAPH_INTERACTION'; payload: { event: string; data: unknown } }) => void) {
      harness.createApiCalls.push(pluginId);
      const container = document.createElement('div');
      container.setAttribute('data-plugin-id', pluginId);
      return {
        getContainer: () => container,
        registerNodeRenderer: () => ({ dispose() {} }),
        registerOverlay: () => ({ dispose() {} }),
        registerTooltipProvider: () => ({ dispose() {} }),
        helpers: {
          drawBadge() {},
          drawProgressRing() {},
          drawLabel() {},
        },
        sendMessage: (message: { type: string; data: unknown }) => {
          postMessage({
            type: 'GRAPH_INTERACTION',
            payload: { event: `plugin:${pluginId}:${message.type}`, data: message.data },
          });
        },
        onMessage: () => ({ dispose() {} }),
      };
    }

    deliverMessage(pluginId: string, message: { type: string; data: unknown }) {
      harness.deliveries.push({ pluginId, message });
    }
  }

  return { WebviewPluginHost: MockWebviewPluginHost };
});

import App from '../../../src/webview/app/App';

vi.stubGlobal('addEventListener', (type: string, listener: (event: MessageEvent) => void) => {
  if (type === 'message') {
    messageListeners.push(listener);
  }
});

vi.stubGlobal('removeEventListener', (type: string, listener: (event: MessageEvent) => void) => {
  if (type === 'message') {
    const index = messageListeners.indexOf(listener);
    if (index !== -1) {
      messageListeners.splice(index, 1);
    }
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

function sendAppMessage(data: unknown): void {
  const event = new MessageEvent('message', { data });
  for (const listener of [...messageListeners]) {
    listener(event);
  }
}

describe('App behavior', () => {
  beforeEach(() => {
    messageListeners.length = 0;
    delete (window as Window & { __codegraphyWebviewReadyPosted?: boolean })
      .__codegraphyWebviewReadyPosted;
    harness.graphProps = null;
    harness.graphRenderCount = 0;
    harness.searchBarProps = null;
    harness.createApiCalls.length = 0;
    harness.deliveries.length = 0;
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    (globalThis as { __pluginActivations?: unknown[] }).__pluginActivations = [];
    resetStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('filters nodes and edges for whole-word searches', () => {
    graphStore.setState({
      graphData: {
        nodes: [
          { id: 'src/App.ts', label: 'App', color: '#123456' },
          { id: 'src/AppService.ts', label: 'AppService', color: '#654321' },
        ],
        edges: [{ id: 'src/App.ts->src/AppService.ts', from: 'src/App.ts', to: 'src/AppService.ts' }],
      },
      searchQuery: 'App',
      searchOptions: { matchCase: false, wholeWord: true, regex: false },
    });

    render(<App />);

    expect(screen.getByTestId('graph-node-ids')).toHaveTextContent('src/App.ts');
    expect(screen.getByTestId('graph-edge-ids')).toHaveTextContent('');
    expect(screen.getByTestId('mock-search-bar')).toHaveAttribute('data-result-count', '1');
    expect(screen.getByTestId('mock-search-bar')).toHaveAttribute('data-total-count', '2');
  });

  it('passes through blank search queries without filtering', () => {
    graphStore.setState({
      graphData: {
        nodes: [
          { id: 'src/App.ts', label: 'App', color: '#123456' },
          { id: 'src/Todo.ts', label: 'Todo', color: '#654321' },
        ],
        edges: [{ id: 'src/App.ts->src/Todo.ts', from: 'src/App.ts', to: 'src/Todo.ts' }],
      },
      searchQuery: '   ',
    });

    render(<App />);

    expect(screen.getByTestId('graph-node-ids')).toHaveTextContent('src/App.ts,src/Todo.ts');
    expect(screen.getByTestId('graph-edge-ids')).toHaveTextContent('src/App.ts->src/Todo.ts');
  });

  it('does not rerender Graph for unchanged decorations after a refresh data update', async () => {
    graphStore.setState({
      graphData: {
        nodes: [{ id: 'src/App.ts', label: 'App', color: '#123456' }],
        edges: [],
      },
      nodeDecorations: {},
      edgeDecorations: {},
    });

    render(<App />);
    expect(screen.getByTestId('mock-graph')).toBeInTheDocument();

    harness.graphRenderCount = 0;

    await act(async () => {
      sendAppMessage({
        type: 'GRAPH_DATA_UPDATED',
        payload: {
          nodes: [{ id: 'src/App.ts', label: 'App', color: '#123456' }],
          edges: [],
        },
      });
    });

    expect(harness.graphRenderCount).toBe(1);

    await act(async () => {
      sendAppMessage({
        type: 'DECORATIONS_UPDATED',
        payload: {
          nodeDecorations: {},
          edgeDecorations: {},
        },
      });
    });

    expect(harness.graphRenderCount).toBe(1);
  });

  it('does not rerender Graph for unchanged groups before a refresh data update', async () => {
    graphStore.setState({
      graphData: {
        nodes: [{ id: 'src/App.ts', label: 'App', color: '#123456' }],
        edges: [],
      },
      groups: [{ id: 'src-group', pattern: 'src/**', color: '#00ff00' }],
    });

    render(<App />);
    expect(screen.getByTestId('mock-graph')).toBeInTheDocument();

    harness.graphRenderCount = 0;

    await act(async () => {
      sendAppMessage({
        type: 'GROUPS_UPDATED',
        payload: {
          groups: [{ id: 'src-group', pattern: 'src/**', color: '#00ff00' }],
        },
      });
    });

    expect(harness.graphRenderCount).toBe(0);

    await act(async () => {
      sendAppMessage({
        type: 'GRAPH_DATA_UPDATED',
        payload: {
          nodes: [{ id: 'src/App.ts', label: 'App', color: '#123456' }],
          edges: [],
        },
      });
    });

    expect(harness.graphRenderCount).toBe(1);
  });

  it('surfaces regex errors and renders an empty filtered graph when the regex is invalid', () => {
    graphStore.setState({
      graphData: {
        nodes: [{ id: 'src/App.ts', label: 'App', color: '#123456' }],
        edges: [],
      },
      searchQuery: '[',
      searchOptions: { matchCase: false, wholeWord: false, regex: true },
    });

    render(<App />);

    expect(screen.getByTestId('graph-node-ids')).toHaveTextContent('');
    expect(screen.getByTestId('mock-search-bar')).toHaveAttribute('data-result-count', '0');
    expect(screen.getByTestId('mock-search-bar').getAttribute('data-regex-error')).toMatch(/unterminated|invalid|character/i);
  });

  it('supports valid regex searches', () => {
    graphStore.setState({
      graphData: {
        nodes: [
          { id: 'src/App.ts', label: 'App', color: '#123456' },
          { id: 'src/Todo.ts', label: 'Todo', color: '#654321' },
        ],
        edges: [],
      },
      searchQuery: '^App src/App\\.ts$',
      searchOptions: { matchCase: true, wholeWord: false, regex: true },
    });

    render(<App />);

    expect(screen.getByTestId('graph-node-ids')).toHaveTextContent('src/App.ts');
  });

  it('updates search query and search options through SearchBar callbacks', async () => {
    graphStore.setState({
      graphData: {
        nodes: [
          { id: 'src/App.ts', label: 'App', color: '#123456' },
          { id: 'src/Todo.ts', label: 'Todo', color: '#654321' },
        ],
        edges: [],
      },
    });

    render(<App />);

    await act(async () => {
      (harness.searchBarProps?.onChange as ((value: string) => void))('Todo');
      (harness.searchBarProps?.onOptionsChange as ((value: { matchCase: boolean; wholeWord: boolean; regex: boolean }) => void))({
        matchCase: true,
        wholeWord: false,
        regex: false,
      });
    });

    expect(graphStore.getState().searchQuery).toBe('Todo');
    expect(graphStore.getState().searchOptions).toEqual({
      matchCase: true,
      wholeWord: false,
      regex: false,
    });
    expect(screen.getByTestId('graph-node-ids')).toHaveTextContent('src/Todo.ts');
  });

  it('applies the first enabled matching group and preserves unmatched node styling', () => {
    graphStore.setState({
      graphData: {
        nodes: [
          { id: 'src/App.ts', label: 'App', color: '#123456' },
          { id: 'notes/Todo.txt', label: 'Todo', color: '#abcdef' },
        ],
        edges: [],
      },
      groups: [
        { id: 'disabled-group', pattern: 'src/**', color: '#ff0000', disabled: true },
        { id: 'enabled-group', pattern: 'src/**', color: '#00ff00', shape2D: 'diamond', shape3D: 'cube', imageUrl: 'https://example.com/icon.png' },
      ],
    });

    render(<App />);

    expect(screen.getByTestId('graph-node-colors')).toHaveTextContent('#00ff00,#abcdef');
    expect(screen.getByTestId('graph-node-shapes')).toHaveTextContent('diamond:cube,none:none');
    expect(screen.getByTestId('graph-node-images')).toHaveTextContent('https://example.com/icon.png,');
  });

  it('routes plugin-scoped messages to the plugin host', async () => {
    render(<App />);

    await act(async () => {
      sendAppMessage({ type: 'plugin:acme.plugin:node:click', data: { nodeId: 'src/App.ts' } });
    });

    expect(harness.deliveries).toEqual([
      {
        pluginId: 'acme.plugin',
        message: { type: 'node:click', data: { nodeId: 'src/App.ts' } },
      },
    ]);
  });

  it('ignores malformed extension messages and unscoped plugin messages', async () => {
    render(<App />);

    await act(async () => {
      sendAppMessage(42);
      sendAppMessage({ type: 'plugin:acme.plugin' });
    });

    expect(harness.deliveries).toEqual([]);
    expect(harness.createApiCalls).toEqual([]);
  });

  it('injects plugin assets, activates scripts once, and reuses cached styles', async () => {
    render(<App />);

    const scriptUrl = 'data:text/javascript,export default { activate(api) { globalThis.__pluginActivations.push({ hasSendMessage: typeof api.sendMessage === "function", hasHelpers: typeof api.helpers.drawLabel === "function" }); } }';

    await act(async () => {
      sendAppMessage({
        type: 'PLUGIN_WEBVIEW_INJECT',
        payload: {
          pluginId: 'acme.plugin',
          scripts: [scriptUrl],
          styles: ['https://example.com/plugin.css'],
        },
      });
      await Promise.resolve();
      await Promise.resolve();
    });
    await vi.dynamicImportSettled();

    await act(async () => {
      sendAppMessage({
        type: 'PLUGIN_WEBVIEW_INJECT',
        payload: {
          pluginId: 'acme.plugin',
          scripts: [scriptUrl],
          styles: ['https://example.com/plugin.css'],
        },
      });
      await Promise.resolve();
      await Promise.resolve();
    });
    await vi.dynamicImportSettled();

    await waitFor(() => {
      expect(harness.createApiCalls).toEqual(['acme.plugin']);
    });
    expect(document.head.querySelectorAll('link[href="https://example.com/plugin.css"]')).toHaveLength(1);
    expect((globalThis as { __pluginActivations?: unknown[] }).__pluginActivations).toEqual([
      { hasSendMessage: true, hasHelpers: true },
    ]);
  });

  it('ignores plugin injection payloads without a string plugin id', async () => {
    render(<App />);

    await act(async () => {
      sendAppMessage({
        type: 'PLUGIN_WEBVIEW_INJECT',
        payload: {
          pluginId: 42,
          scripts: ['data:text/javascript,export default {}'],
          styles: ['https://example.com/ignored.css'],
        },
      });
      await Promise.resolve();
    });
    await vi.dynamicImportSettled();

    expect(harness.createApiCalls).toEqual([]);
    expect(document.head.querySelectorAll('link')).toHaveLength(0);
    expect((globalThis as { __pluginActivations?: unknown[] }).__pluginActivations).toEqual([]);
  });

  it('normalizes non-array plugin asset payloads to empty lists', async () => {
    render(<App />);

    await act(async () => {
      sendAppMessage({
        type: 'PLUGIN_WEBVIEW_INJECT',
        payload: {
          pluginId: 'acme.plugin',
          scripts: 'not-an-array',
          styles: 'not-an-array',
        },
      });
      await Promise.resolve();
    });
    await vi.dynamicImportSettled();

    expect(harness.createApiCalls).toEqual([]);
    expect(document.head.querySelectorAll('link')).toHaveLength(0);
  });

  it('warns when an injected plugin script does not expose activate', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<App />);

    await act(async () => {
      sendAppMessage({
        type: 'PLUGIN_WEBVIEW_INJECT',
        payload: {
          pluginId: 'acme.plugin',
          scripts: ['data:text/javascript,export default {}'],
          styles: [],
        },
      });
      await Promise.resolve();
      await Promise.resolve();
    });
    await vi.dynamicImportSettled();

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('has no activate(api) export'));
    });
    expect(harness.createApiCalls).toEqual([]);
  });

  it('shows the hidden-files hint when the graph is empty and orphans are disabled', () => {
    graphStore.setState({
      graphData: { nodes: [], edges: [] },
      showOrphans: false,
    });

    render(<App />);

    expect(screen.getByText(/All files are hidden/)).toBeInTheDocument();
  });

  it('closes plugin and settings panels back to none', async () => {
    graphStore.setState({
      graphData: { nodes: [{ id: 'src/App.ts', label: 'App', color: '#123456' }], edges: [] },
      activePanel: 'plugins',
    });
    const { rerender } = render(<App />);

    await act(async () => {
      screen.getByTestId('plugins-panel').click();
    });
    expect(graphStore.getState().activePanel).toBe('none');

    await act(async () => {
      graphStore.setState({ activePanel: 'settings' });
    });
    rerender(<App />);

    await act(async () => {
      screen.getByTestId('settings-panel').click();
    });
    expect(graphStore.getState().activePanel).toBe('none');
  });

  it('shows the toolbar when activePanel is none', () => {
    graphStore.setState({
      graphData: { nodes: [{ id: 'src/App.ts', label: 'App', color: '#123456' }], edges: [] },
      activePanel: 'none',
    });

    render(<App />);

    expect(screen.getByTestId('toolbar')).toBeInTheDocument();
  });

  it('shows timeline component regardless of activePanel', () => {
    graphStore.setState({
      graphData: { nodes: [{ id: 'src/App.ts', label: 'App', color: '#123456' }], edges: [] },
      activePanel: 'settings',
    });

    render(<App />);

    expect(screen.getByTestId('timeline')).toBeInTheDocument();
  });

  it('renders the graph when timeline is active even with empty graph data', () => {
    graphStore.setState({
      graphData: { nodes: [], edges: [] },
      timelineActive: true,
    });

    render(<App />);

    expect(screen.getByTestId('mock-graph')).toBeInTheDocument();
  });

  it('renders empty state when timeline is inactive and graph has no nodes', () => {
    graphStore.setState({
      graphData: { nodes: [], edges: [] },
      timelineActive: false,
    });

    render(<App />);

    expect(screen.getByText(/No files found/)).toBeInTheDocument();
  });

  it('renders the graph with colored data when available', () => {
    graphStore.setState({
      graphData: {
        nodes: [{ id: 'src/App.ts', label: 'App', color: '#123456' }],
        edges: [],
      },
      groups: [{ id: 'g1', pattern: 'src/**', color: '#abcdef' }],
    });

    render(<App />);

    expect(screen.getByTestId('graph-node-colors')).toHaveTextContent('#abcdef');
  });

  it('renders the graph with effective graph data when colored data is null', () => {
    graphStore.setState({
      graphData: {
        nodes: [{ id: 'src/App.ts', label: 'App', color: '#123456' }],
        edges: [],
      },
      groups: [],
    });

    render(<App />);

    expect(screen.getByTestId('mock-graph')).toBeInTheDocument();
  });

  it('shows the loading state when isLoading is true', () => {
    graphStore.setState({
      isLoading: true,
    });

    render(<App />);

    expect(screen.getByText('Loading graph...')).toBeInTheDocument();
  });

  it('shows the empty state when graphData is null and timeline is not active', () => {
    graphStore.setState({
      graphData: null,
      timelineActive: false,
      isLoading: false,
    });

    render(<App />);

    expect(screen.getByText(/No files found/)).toBeInTheDocument();
  });
});
