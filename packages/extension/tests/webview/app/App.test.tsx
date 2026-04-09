import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import App from '../../../src/webview/app/App';
import { graphStore } from '../../../src/webview/store/state';
import { DEFAULT_DIRECTION_COLOR } from '../../../src/shared/fileColors';

// Mock window message listeners
const messageListeners: ((event: MessageEvent) => void)[] = [];

vi.stubGlobal('addEventListener', (type: string, listener: (event: MessageEvent) => void) => {
  if (type === 'message') {
    messageListeners.push(listener);
  }
});

vi.stubGlobal('removeEventListener', (type: string, listener: (event: MessageEvent) => void) => {
  if (type === 'message') {
    const index = messageListeners.indexOf(listener);
    if (index > -1) messageListeners.splice(index, 1);
  }
});

/** Reset store to initial state between tests */
function resetStore() {
  graphStore.setState({
    graphData: null,
    isLoading: true,
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
    maxFiles: 500,
  });
}

describe('App', () => {
  beforeEach(() => {
    messageListeners.length = 0;
    delete (window as Window & { __codegraphyWebviewReadyPosted?: boolean })
      .__codegraphyWebviewReadyPosted;
    resetStore();
    vi.useFakeTimers();
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

    expect(screen.queryByText('Loading graph...')).not.toBeInTheDocument();
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

  it('should render the export button when graph is loaded', async () => {
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
    });
    expect(screen.getByTitle('Export')).toBeInTheDocument();
  });
});

// ── Message Handler Coverage ────────────────────────────────────────────────

function sendMessage(data: unknown) {
  const event = new MessageEvent('message', { data });
  messageListeners.forEach((listener) => listener(event));
}

describe('App: message handlers', () => {
  beforeEach(() => {
    messageListeners.length = 0;
    delete (window as Window & { __codegraphyWebviewReadyPosted?: boolean })
      .__codegraphyWebviewReadyPosted;
    resetStore();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('SETTINGS_UPDATED updates settings state', async () => {
    render(<App />);
    await act(async () => {
      sendMessage({
        type: 'SETTINGS_UPDATED',
        payload: {
          bidirectionalEdges: 'combined',
          showOrphans: false,
        },
      });
    });
    expect(graphStore.getState().bidirectionalMode).toBe('combined');
    expect(graphStore.getState().showOrphans).toBe(false);
  });

  it('DIRECTION_SETTINGS_UPDATED updates direction mode state', async () => {
    render(<App />);
    await act(async () => {
      sendMessage({ type: 'DIRECTION_SETTINGS_UPDATED', payload: { directionMode: 'particles', directionColor: '#00FF00', particleSpeed: 0.01, particleSize: 6 } });
    });
    expect(graphStore.getState().directionMode).toBe('particles');
    expect(graphStore.getState().directionColor).toBe('#00FF00');
    expect(graphStore.getState().particleSpeed).toBe(0.01);
    expect(graphStore.getState().particleSize).toBe(6);
  });

  it('FAVORITES_UPDATED message is handled without error', async () => {
    render(<App />);
    await act(async () => {
      sendMessage({ type: 'FAVORITES_UPDATED', payload: { favorites: ['src/index.ts'] } });
    });
    expect(graphStore.getState().favorites).toEqual(new Set(['src/index.ts']));
  });

  it('FILTER_PATTERNS_UPDATED message is handled', async () => {
    render(<App />);
    await act(async () => {
      sendMessage({ type: 'FILTER_PATTERNS_UPDATED', payload: { patterns: ['**/*.test.ts'], pluginPatterns: [] } });
    });
    expect(graphStore.getState().filterPatterns).toEqual(['**/*.test.ts']);
  });

  it('LEGENDS_UPDATED message is handled', async () => {
    render(<App />);
    await act(async () => {
      sendMessage({
        type: 'LEGENDS_UPDATED',
        payload: { groups: [{ id: 'g1', pattern: 'src/**', color: '#ff0000' }] },
      });
    });
    expect(graphStore.getState().groups).toEqual([{ id: 'g1', pattern: 'src/**', color: '#ff0000' }]);
  });

  it('PHYSICS_SETTINGS_UPDATED message is handled', async () => {
    render(<App />);
    const physics = {
      repelForce: 4,
      centerForce: 0.02,
      linkDistance: 150,
      linkForce: 0.05,
      damping: 0.5,
    };
    await act(async () => {
      sendMessage({
        type: 'PHYSICS_SETTINGS_UPDATED',
        payload: physics,
      });
    });
    expect(graphStore.getState().physicsSettings).toEqual(physics);
  });

  it('DEPTH_LIMIT_UPDATED message is handled', async () => {
    render(<App />);
    await act(async () => {
      sendMessage({ type: 'DEPTH_LIMIT_UPDATED', payload: { depthLimit: 3 } });
    });
    expect(graphStore.getState().depthLimit).toBe(3);
  });

  it('DEPTH_LIMIT_RANGE_UPDATED message is handled', async () => {
    render(<App />);
    await act(async () => {
      sendMessage({ type: 'DEPTH_LIMIT_RANGE_UPDATED', payload: { maxDepthLimit: 2 } });
    });
    expect(graphStore.getState().maxDepthLimit).toBe(2);
  });
});
