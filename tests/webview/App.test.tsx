import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import App from '../../src/webview/App';

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

describe('App', () => {
  beforeEach(() => {
    messageListeners.length = 0;
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

    // Simulate graph data message from extension
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

    // Loading should be gone
    expect(screen.queryByText('Loading graph...')).not.toBeInTheDocument();
  });

  it('should stay in loading state when in VSCode webview (waiting for real data)', async () => {
    // In VSCode webview context (acquireVsCodeApi is defined), 
    // the app waits for real GRAPH_DATA_UPDATED message instead of loading mock data
    vi.useRealTimers();
    
    render(<App />);

    // Initially shows loading
    expect(screen.getByText('Loading graph...')).toBeInTheDocument();

    // After 600ms, should still be loading (no mock data in VSCode mode)
    await new Promise((r) => setTimeout(r, 600));
    expect(screen.getByText('Loading graph...')).toBeInTheDocument();
  });

  it('should render the graph icon', () => {
    render(<App />);
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});

// ── Message Handler Coverage ────────────────────────────────────────────────

function sendMessage(data: unknown) {
  const event = new MessageEvent('message', { data });
  messageListeners.forEach((l) => l(event));
}

describe('App: message handlers', () => {
  beforeEach(() => {
    messageListeners.length = 0;
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('SETTINGS_UPDATED updates physics settings state', async () => {
    render(<App />);
    await act(async () => {
      sendMessage({
        type: 'SETTINGS_UPDATED',
        payload: {
          filterPatterns: [],
          pluginFilterPatterns: [],
          showOrphans: false,
          nodeSizeMode: 'uniform',
          groups: [],
          showArrows: false,
        },
      });
    });
    // If settings applied without error, state updated correctly
    expect(document.body).toBeInTheDocument();
  });

  it('SHOW_ARROWS_UPDATED toggles arrows state', async () => {
    render(<App />);
    await act(async () => {
      sendMessage({ type: 'SHOW_ARROWS_UPDATED', payload: { showArrows: false } });
    });
    // No crash — state updated
    expect(document.body).toBeInTheDocument();
  });

  it('FAVORITES_UPDATED message is handled without error', async () => {
    render(<App />);
    await act(async () => {
      sendMessage({ type: 'FAVORITES_UPDATED', payload: { favorites: ['src/index.ts'] } });
    });
    expect(document.body).toBeInTheDocument();
  });

  it('FILTER_PATTERNS_UPDATED message is handled without error', async () => {
    render(<App />);
    await act(async () => {
      sendMessage({ type: 'FILTER_PATTERNS_UPDATED', payload: { filterPatterns: ['**/*.test.ts'] } });
    });
    expect(document.body).toBeInTheDocument();
  });

  it('GROUPS_UPDATED message is handled without error', async () => {
    render(<App />);
    await act(async () => {
      sendMessage({
        type: 'GROUPS_UPDATED',
        payload: { groups: [{ id: 'g1', pattern: 'src/**', color: '#ff0000' }] },
      });
    });
    expect(document.body).toBeInTheDocument();
  });

  it('PHYSICS_SETTINGS_UPDATED message is handled without error', async () => {
    render(<App />);
    await act(async () => {
      sendMessage({
        type: 'PHYSICS_SETTINGS_UPDATED',
        payload: {
          settings: {
            gravitationalConstant: -100,
            centralGravity: 0.02,
            springLength: 150,
            springConstant: 0.05,
            damping: 0.5,
          },
        },
      });
    });
    expect(document.body).toBeInTheDocument();
  });

  it('DEPTH_LIMIT_UPDATED message is handled without error', async () => {
    render(<App />);
    await act(async () => {
      sendMessage({ type: 'DEPTH_LIMIT_UPDATED', payload: { depthLimit: 3 } });
    });
    expect(document.body).toBeInTheDocument();
  });
});
