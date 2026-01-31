import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
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

  it('should load mock data after timeout in development', async () => {
    vi.useRealTimers(); // Use real timers for this test
    
    render(<App />);

    // Initially shows loading
    expect(screen.getByText('Loading graph...')).toBeInTheDocument();

    // Wait for mock data to load (500ms timeout in App.tsx)
    await waitFor(
      () => {
        expect(screen.queryByText('Loading graph...')).not.toBeInTheDocument();
      },
      { timeout: 1000 }
    );
  });

  it('should render the graph icon', () => {
    render(<App />);
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
