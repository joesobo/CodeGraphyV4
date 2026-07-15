import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import App from '../../../../src/webview/app/view';
import { graphStore } from '../../../../src/webview/store/state';
import { STRUCTURAL_NESTS_EDGE_KIND } from '../../../../src/shared/graphControls/defaults/definitions';
import { messageListeners, resetStore, sendMessage } from './view/fixture';

describe('App', () => {
  beforeEach(() => {
    messageListeners.length = 0;
    delete (window as Window & { __codegraphyWebviewReadyPosted?: boolean })
      .__codegraphyWebviewReadyPosted;
    resetStore();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render the CodeGraphy title', () => {
    render(<App />);
    expect(screen.getByText('CodeGraphy')).toBeInTheDocument();
  });

  it('should show loading state initially', () => {
    render(<App />);
    expect(screen.getByText('Loading graph...')).toBeInTheDocument();
  });

  it('buffers graph bootstrap while WASM physics is loading', async () => {
    let finishPhysics: (() => void) | undefined;
    const graphPhysicsPreparation = new Promise<void>(resolve => {
      finishPhysics = resolve;
    });
    render(<App graphPhysicsPreparation={graphPhysicsPreparation} />);

    await act(async () => {
      sendMessage({
        type: 'GRAPH_DATA_UPDATED',
        payload: {
          nodes: [{ id: 'test.ts', label: 'test.ts', color: '#3B82F6' }],
          edges: [],
        },
      });
      sendMessage({ type: 'APP_BOOTSTRAP_COMPLETE' });
    });

    expect(screen.getByText('Loading graph...')).toBeInTheDocument();

    await act(async () => { finishPhysics?.(); });

    expect(screen.queryByText('Loading graph...')).not.toBeInTheDocument();
    expect(screen.getByTitle('Graph Scope')).toBeInTheDocument();
  });

  it('shows an explicit error when WASM physics cannot initialize', async () => {
    render(<App graphPhysicsPreparation={Promise.reject(new Error('compile failed'))} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to initialize graph physics: compile failed',
    );
  });

  it('should render graph after receiving GRAPH_DATA_UPDATED message', async () => {
    render(<App />);

    const graphDataEvent = new MessageEvent('message', {
      data: {
        type: 'GRAPH_DATA_UPDATED',
        payload: {
          nodes: [{ id: 'test.ts', label: 'test.ts', color: '#3B82F6' }],
          edges: [],
        },
      },
    });

    await act(async () => {
      messageListeners.forEach((listener) => listener(graphDataEvent));
    });

    expect(screen.getByText('Loading graph...')).toBeInTheDocument();

    await act(async () => {
      sendMessage({ type: 'APP_BOOTSTRAP_COMPLETE' });
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading graph...')).not.toBeInTheDocument();
    });
  });

  it('keeps the graph hidden until startup bootstrap is complete', async () => {
    render(<App />);

    await act(async () => {
      sendMessage({
        type: 'GRAPH_DATA_UPDATED',
        payload: {
          nodes: [{ id: 'test.ts', label: 'test.ts', color: '#3B82F6' }],
          edges: [],
        },
      });
    });

    expect(screen.getByText('Loading graph...')).toBeInTheDocument();
    expect(screen.queryByTitle('Graph Scope')).not.toBeInTheDocument();

    await act(async () => {
      sendMessage({ type: 'APP_BOOTSTRAP_COMPLETE' });
    });

    expect(screen.queryByText('Loading graph...')).not.toBeInTheDocument();
    expect(screen.getByTitle('Graph Scope')).toBeInTheDocument();
  });

  it('applies queued graph and filter updates after startup bootstrap completes', async () => {
    render(<App />);

    await act(async () => {
      sendMessage({
        type: 'FILTER_PATTERNS_UPDATED',
        payload: {
          patterns: ['dist/**'],
          pluginPatterns: [],
          pluginPatternGroups: [],
          disabledCustomPatterns: [],
          disabledPluginPatterns: [],
        },
      });
      sendMessage({
        type: 'GRAPH_DATA_UPDATED',
        payload: {
          nodes: [{ id: 'src/app.ts', label: 'app.ts', color: '#3B82F6' }],
          edges: [],
        },
      });
    });

    expect(screen.getByText('Loading graph...')).toBeInTheDocument();

    await act(async () => {
      sendMessage({ type: 'APP_BOOTSTRAP_COMPLETE' });
    });

    expect(screen.getByText('1 node • 0 connections')).toBeInTheDocument();
  });

  it('keeps the first graph visible while startup plugin assets finish loading', async () => {
    let resolveInjection: (() => void) | undefined;
    const pendingImport = new Promise<void>((resolve) => {
      resolveInjection = resolve;
    });
    vi.doMock('/plugin/startup.js', () => pendingImport.then(() => ({
      activate: vi.fn(),
    })));

    render(<App />);

    await act(async () => {
      sendMessage({
        type: 'PLUGIN_WEBVIEW_INJECT',
        payload: {
          pluginId: 'codegraphy.test',
          scripts: ['/plugin/startup.js'],
          styles: [],
        },
      });
      sendMessage({
        type: 'GRAPH_DATA_UPDATED',
        payload: {
          nodes: [{ id: 'test.ts', label: 'test.ts', color: '#3B82F6' }],
          edges: [],
        },
      });
      sendMessage({ type: 'APP_BOOTSTRAP_COMPLETE' });
    });

    expect(screen.queryByText('Loading graph...')).not.toBeInTheDocument();
    expect(screen.getByText('1 node • 0 connections')).toBeInTheDocument();

    await act(async () => {
      resolveInjection?.();
      await pendingImport;
    });

    expect(screen.queryByText('Loading graph...')).not.toBeInTheDocument();
    expect(screen.getByText('1 node • 0 connections')).toBeInTheDocument();
  });

  it('keeps the graph visible when plugin assets are injected after startup', async () => {
    let resolveInjection: (() => void) | undefined;
    const pendingImport = new Promise<void>((resolve) => {
      resolveInjection = resolve;
    });
    vi.doMock('/plugin/late-registration.js', () => pendingImport.then(() => ({
      activate: vi.fn(),
    })));

    render(<App />);

    await act(async () => {
      sendMessage({
        type: 'GRAPH_DATA_UPDATED',
        payload: {
          nodes: [{ id: 'test.ts', label: 'test.ts', color: '#3B82F6' }],
          edges: [],
        },
      });
      sendMessage({ type: 'APP_BOOTSTRAP_COMPLETE' });
    });

    expect(screen.queryByText('Loading graph...')).not.toBeInTheDocument();
    expect(screen.getByText('1 node • 0 connections')).toBeInTheDocument();

    await act(async () => {
      sendMessage({
        type: 'PLUGIN_WEBVIEW_INJECT',
        payload: {
          pluginId: 'codegraphy.late',
          scripts: ['/plugin/late-registration.js'],
          styles: [],
        },
      });
    });

    expect(screen.queryByText('Loading graph...')).not.toBeInTheDocument();
    expect(screen.getByText('1 node • 0 connections')).toBeInTheDocument();

    await act(async () => {
      resolveInjection?.();
      await pendingImport;
    });

    expect(screen.queryByText('Loading graph...')).not.toBeInTheDocument();
    expect(screen.getByText('1 node • 0 connections')).toBeInTheDocument();
  });

  it('makes saved plugin data available when a plugin activates during startup', async () => {
    const pluginData = {
      enabled: true,
      preset: 'embers',
    };
    const globals = globalThis as typeof globalThis & { __startupPluginData?: unknown };
    delete globals.__startupPluginData;
    const scriptUrl = 'data:text/javascript,export function activate(api) { globalThis.__startupPluginData = api.getPluginData(); }';

    render(<App />);

    await act(async () => {
      sendMessage({
        type: 'PLUGIN_DATA_UPDATED',
        payload: {
          pluginId: 'codegraphy.particles',
          data: pluginData,
        },
      });
      sendMessage({
        type: 'PLUGIN_WEBVIEW_INJECT',
        payload: {
          pluginId: 'codegraphy.particles',
          scripts: [scriptUrl],
          styles: [],
        },
      });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(globals.__startupPluginData).toEqual(pluginData);
    });
  });

  it('keeps the graph visible when settings and filters update after startup', async () => {
    render(<App />);

    await act(async () => {
      sendMessage({
        type: 'GRAPH_DATA_UPDATED',
        payload: {
          nodes: [{ id: 'test.ts', label: 'test.ts', color: '#3B82F6' }],
          edges: [],
        },
      });
      sendMessage({ type: 'APP_BOOTSTRAP_COMPLETE' });
    });

    expect(screen.queryByText('Loading graph...')).not.toBeInTheDocument();
    expect(screen.getByText('1 node • 0 connections')).toBeInTheDocument();

    await act(async () => {
      sendMessage({
        type: 'SETTINGS_UPDATED',
        payload: {
          bidirectionalEdges: 'combined',
          showOrphans: true,
        },
      });
      sendMessage({
        type: 'FILTER_PATTERNS_UPDATED',
        payload: {
          patterns: ['dist/**'],
          pluginPatterns: ['plugin/**'],
          pluginPatternGroups: [],
          disabledCustomPatterns: [],
          disabledPluginPatterns: [],
        },
      });
      sendMessage({
        type: 'GRAPH_DATA_UPDATED',
        payload: {
          nodes: [
            { id: 'test.ts', label: 'test.ts', color: '#3B82F6' },
            { id: 'src/app.ts', label: 'app.ts', color: '#10B981' },
          ],
          edges: [],
        },
      });
    });

    expect(graphStore.getState().bidirectionalMode).toBe('combined');
    expect(graphStore.getState().filterPatterns).toEqual(['dist/**']);
    expect(screen.queryByText('Loading graph...')).not.toBeInTheDocument();
    expect(screen.getByText('2 nodes • 0 connections')).toBeInTheDocument();
  });

  it('keeps the graph visible while indexing after startup', async () => {
    render(<App />);

    await act(async () => {
      sendMessage({
        type: 'GRAPH_DATA_UPDATED',
        payload: {
          nodes: [{ id: 'test.ts', label: 'test.ts', color: '#3B82F6' }],
          edges: [],
        },
      });
      sendMessage({ type: 'APP_BOOTSTRAP_COMPLETE' });
    });

    expect(screen.queryByText('Loading graph...')).not.toBeInTheDocument();
    expect(screen.getByTitle('Graph Scope')).toBeInTheDocument();

    await act(async () => {
      sendMessage({
        type: 'GRAPH_INDEX_PROGRESS',
        payload: { phase: 'Indexing Workspace', current: 1, total: 4 },
      });
    });

    expect(screen.queryByText('Loading graph...')).not.toBeInTheDocument();
    expect(screen.getByTitle('Graph Scope')).toBeInTheDocument();
    expect(screen.getByTestId('graph-index-status')).toBeInTheDocument();
    expect(screen.getByText('Indexing Workspace')).toBeInTheDocument();
  });

  it('keeps current graph stats visible while explicit indexing progress is active', async () => {
    render(<App />);

    await act(async () => {
      sendMessage({
        type: 'GRAPH_DATA_UPDATED',
        payload: {
          nodes: [{ id: 'test.ts', label: 'test.ts', color: '#3B82F6' }],
          edges: [],
        },
      });
      sendMessage({ type: 'APP_BOOTSTRAP_COMPLETE' });
    });

    expect(screen.getByText('1 node • 0 connections')).toBeInTheDocument();

    await act(async () => {
      sendMessage({
        type: 'GRAPH_INDEX_PROGRESS',
        payload: { phase: 'Preparing Analysis', current: 0, total: 1 },
      });
    });

    expect(screen.getByText('1 node • 0 connections')).toBeInTheDocument();
    expect(screen.getByText('Preparing Analysis')).toBeInTheDocument();

    await act(async () => {
      sendMessage({
        type: 'GRAPH_DATA_UPDATED',
        payload: {
          nodes: [
            { id: 'test.ts', label: 'test.ts', color: '#3B82F6' },
            { id: 'used.ts', label: 'used.ts', color: '#3B82F6' },
          ],
          edges: [
            { id: 'test.ts->used.ts#import', from: 'test.ts', to: 'used.ts', kind: 'import', sources: [] },
          ],
        },
      });
    });

    expect(screen.queryByText('Preparing Analysis')).not.toBeInTheDocument();
    expect(screen.getByText('2 nodes • 1 connection')).toBeInTheDocument();
  });

  it('should send WEBVIEW_READY only once across initial graph load', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sentMessages = (globalThis as any).__vscodeSentMessages as Array<{ type?: string }>;
    sentMessages.length = 0;

    render(<App />);

    await act(async () => {
      messageListeners.forEach((listener) => listener(new MessageEvent('message', {
        data: {
          type: 'GRAPH_DATA_UPDATED',
          payload: {
            nodes: [{ id: 'test.ts', label: 'test.ts', color: '#3B82F6' }],
            edges: [],
          },
        },
      })));
      sendMessage({ type: 'APP_BOOTSTRAP_COMPLETE' });
    });

    const readyMessages = sentMessages.filter((msg) => msg.type === 'WEBVIEW_READY');
    expect(readyMessages).toHaveLength(1);
  });

  it('should stay in loading state when in VSCode webview (waiting for real data)', async () => {
    vi.useRealTimers();

    render(<App />);

    expect(screen.getByText('Loading graph...')).toBeInTheDocument();

    await new Promise((r) => setTimeout(r, 600));
    expect(screen.getByText('Loading graph...')).toBeInTheDocument();
  });

  it('should render the graph icon', () => {
    render(<App />);
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should render graph-local and system toolbar buttons when graph is loaded', async () => {
    render(<App />);
    await act(async () => {
      messageListeners.forEach((listener) => listener(new MessageEvent('message', {
        data: {
          type: 'GRAPH_DATA_UPDATED',
          payload: {
            nodes: [{ id: 'test.ts', label: 'test.ts', color: '#3B82F6' }],
            edges: [],
          },
        },
      })));
      sendMessage({ type: 'APP_BOOTSTRAP_COMPLETE' });
    });
    expect(screen.getByTitle('Graph Scope')).toBeInTheDocument();
    expect(screen.getByTitle('Themes')).toBeInTheDocument();
    expect(screen.getByTitle('Plugins')).toBeInTheDocument();
    expect(screen.getByTitle('Settings')).toBeInTheDocument();
    expect(screen.queryByTitle('Export')).not.toBeInTheDocument();
  });

  it('should render graph corner controls when graph is loaded', async () => {
    render(<App />);
    await act(async () => {
      messageListeners.forEach((listener) => listener(new MessageEvent('message', {
        data: {
          type: 'GRAPH_DATA_UPDATED',
          payload: {
            nodes: [{ id: 'test.ts', label: 'test.ts', color: '#3B82F6' }],
            edges: [],
          },
        },
      })));
      sendMessage({ type: 'APP_BOOTSTRAP_COMPLETE' });
    });

    expect(screen.getByTitle('Zoom In')).toBeInTheDocument();
    expect(screen.getByTitle('Zoom Out')).toBeInTheDocument();
    expect(screen.getByTitle('Fit to Screen')).toBeInTheDocument();
    expect(screen.getByTitle('Open in Editor')).toBeInTheDocument();
  });

  it('should render current node and edge counts in the top right', async () => {
    render(<App />);
    await act(async () => {
      messageListeners.forEach((listener) => listener(new MessageEvent('message', {
        data: {
          type: 'GRAPH_DATA_UPDATED',
          payload: {
            nodes: [
              { id: 'a.ts', label: 'a.ts', color: '#3B82F6' },
              { id: 'b.ts', label: 'b.ts', color: '#3B82F6' },
            ],
            edges: [
              { id: 'a.ts->b.ts#import', from: 'a.ts', to: 'b.ts', kind: 'import', sources: [] },
            ],
          },
        },
      })));
      sendMessage({ type: 'APP_BOOTSTRAP_COMPLETE' });
    });

    expect(screen.getByText('2 nodes • 1 connection')).toBeInTheDocument();
  });

  it('keeps cold-cache file nodes visible after scope, filter, search, and Show Orphans', async () => {
    graphStore.setState({
      showOrphans: false,
      graphHasIndex: false,
      graphIndexFreshness: 'missing',
      filterPatterns: ['src'],
      searchQuery: 'a',
      nodeVisibility: { file: true },
    });

    render(<App />);
    await act(async () => {
      sendMessage({
        type: 'GRAPH_DATA_UPDATED',
        payload: {
          nodes: [
            { id: 'src/a.ts', label: 'a.ts', color: '#3B82F6', nodeType: 'file' },
            { id: 'docs/b.ts', label: 'b.ts', color: '#10B981', nodeType: 'file' },
          ],
          edges: [],
        },
      });
      sendMessage({ type: 'APP_BOOTSTRAP_COMPLETE' });
    });

    expect(screen.getByText('1 node • 0 connections')).toBeInTheDocument();
  });

  it('counts filters against the scoped visible graph instead of raw graph data', () => {
    graphStore.setState({
      graphData: {
        nodes: [
          { id: 'src/lib/a.ts', label: 'a.ts', color: '#3B82F6', nodeType: 'file' },
          { id: 'README.md', label: 'README.md', color: '#3B82F6', nodeType: 'file' },
        ],
        edges: [],
      },
      graphEdgeTypes: [
        { id: STRUCTURAL_NESTS_EDGE_KIND, label: 'Nests', defaultColor: '#222222', defaultVisible: true },
      ],
      filterPatterns: ['src/lib'],
      isLoading: false,
      nodeVisibility: {
        file: false,
        folder: true,
      },
      edgeVisibility: {
        [STRUCTURAL_NESTS_EDGE_KIND]: true,
      },
      showOrphans: true,
    });

    render(<App />);

    expect(screen.getByText('2 of 3')).toBeInTheDocument();
  });

  it('responds with the current visible graph state after scope settings apply', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sentMessages = (globalThis as any).__vscodeSentMessages as Array<{
      type?: string;
      payload?: unknown;
    }>;
    sentMessages.length = 0;

    graphStore.setState({
      graphData: {
        nodes: [
          { id: 'src/app.ts', label: 'app.ts', color: '#3B82F6', nodeType: 'file' },
          {
            id: 'src/app.ts#run:function',
            label: 'run',
            color: '#8B5CF6',
            nodeType: 'symbol',
            symbol: {
              id: 'src/app.ts#run:function',
              name: 'run',
              kind: 'function',
              filePath: 'src/app.ts',
            },
          },
        ],
        edges: [
          {
            id: 'src/app.ts->src/app.ts#run:function#contains',
            from: 'src/app.ts',
            to: 'src/app.ts#run:function',
            kind: 'contains',
            sources: [],
          },
        ],
      },
      graphEdgeTypes: [
        { id: 'contains', label: 'Contains', defaultColor: '#222222', defaultVisible: true },
      ],
      isLoading: false,
      nodeVisibility: {
        file: true,
        symbol: true,
        'symbol:function': true,
      },
      edgeVisibility: {
        contains: true,
      },
      showOrphans: true,
    });

    render(<App />);
    await act(async () => {
      sendMessage({ type: 'GET_VISIBLE_GRAPH_STATE' });
    });

    expect(sentMessages).toContainEqual({
      type: 'VISIBLE_GRAPH_STATE_RESPONSE',
      payload: {
        nodeCount: 2,
        nodes: [
          { id: 'src/app.ts', nodeType: 'file', color: '#3B82F6' },
          { id: 'src/app.ts#run:function', nodeType: 'symbol', color: '#8B5CF6' },
        ],
        edgeCount: 1,
        edgeIds: ['src/app.ts->src/app.ts#run:function#contains'],
      },
    });
  });

  it('updates the excluded count immediately when plugin filters are disabled', () => {
    graphStore.setState({
      graphData: {
        nodes: [
          { id: 'src/generated/a.ts', label: 'a.ts', color: '#3B82F6', nodeType: 'file' },
          { id: 'src/app.ts', label: 'app.ts', color: '#3B82F6', nodeType: 'file' },
        ],
        edges: [],
      },
      isLoading: false,
      pluginFilterGroups: [
        { pluginId: 'plugin.one', pluginName: 'Plugin One', patterns: ['**/generated/**'] },
      ],
      pluginFilterPatterns: ['**/generated/**'],
      disabledPluginFilterPatterns: [],
      showOrphans: true,
    });

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Filters, 1 enabled' }));
    expect(screen.getByText('1 excluded from graph')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Disable plugin Plugin One filters'));

    expect(screen.getByText('0 excluded from graph')).toBeInTheDocument();
  });

  it('should hide graph corner controls while a right-side popup is open', async () => {
    graphStore.setState({ activePanel: 'graphScope' });

    render(<App />);
    await act(async () => {
      messageListeners.forEach((listener) => listener(new MessageEvent('message', {
        data: {
          type: 'GRAPH_DATA_UPDATED',
          payload: {
            nodes: [{ id: 'test.ts', label: 'test.ts', color: '#3B82F6' }],
            edges: [],
          },
        },
      })));
      sendMessage({ type: 'APP_BOOTSTRAP_COMPLETE' });
    });

    expect(screen.getByText('Graph Scope')).toBeInTheDocument();
    expect(screen.queryByTitle('Zoom In')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Zoom Out')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Fit to Screen')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Open in Editor')).not.toBeInTheDocument();
  });
});
