/**
 * Integration tests for webview-extension message flow.
 * These tests verify the complete data pipeline from webview ready to graph display.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import App from '../../src/webview/app/view';

// Track message listeners
const messageListeners: ((event: MessageEvent) => void)[] = [];

// Create a spy for postMessage
const postMessageSpy = vi.fn();

// Override the global acquireVsCodeApi to return our spy
vi.stubGlobal('acquireVsCodeApi', () => ({
  postMessage: postMessageSpy,
  getState: vi.fn(),
  setState: vi.fn(),
}));

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

function sendMessage(data: unknown) {
  const event = new MessageEvent('message', { data });
  messageListeners.forEach((listener) => listener(event));
}

describe('Webview-Extension Integration', () => {
  beforeEach(() => {
    messageListeners.length = 0;
    delete (window as Window & { __codegraphyWebviewReadyPosted?: boolean })
      .__codegraphyWebviewReadyPosted;
    postMessageSpy.mockClear();
  });

  it('should show loading state until startup bootstrap completes', async () => {
    render(<App />);
    
    // Should be in loading state
    expect(screen.getByText('Loading graph...')).toBeInTheDocument();
    
    // Simulate extension responding with graph data
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

    await act(async () => {
      sendMessage({ type: 'APP_BOOTSTRAP_COMPLETE' });
    });
    
    // Should no longer be loading
    await waitFor(() => {
      expect(screen.queryByText('Loading graph...')).not.toBeInTheDocument();
    });
  });

  it('should complete full message flow: GRAPH_DATA_UPDATED → render', async () => {
    await act(async () => {
      render(<App />);
    });
    
    // 2. Simulate extension processing and responding
    await act(async () => {
      sendMessage({
        type: 'GRAPH_DATA_UPDATED',
        payload: {
          nodes: [
            { id: 'src/index.ts', label: 'index.ts', color: '#93C5FD' },
            { id: 'src/utils.ts', label: 'utils.ts', color: '#86EFAC' },
          ],
          edges: [
            { from: 'src/index.ts', to: 'src/utils.ts' },
          ],
        },
      });
      sendMessage({ type: 'APP_BOOTSTRAP_COMPLETE' });
    });
    
    // 3. Graph should render (loading gone, graph container present)
    await waitFor(() => {
      expect(screen.queryByText('Loading graph...')).not.toBeInTheDocument();
    });
  });

  it('should handle empty graph data gracefully', async () => {
    render(<App />);
    
    // Send empty graph data
    await act(async () => {
      sendMessage({
        type: 'GRAPH_DATA_UPDATED',
        payload: {
          nodes: [],
          edges: [],
        },
      });
      sendMessage({ type: 'APP_BOOTSTRAP_COMPLETE' });
    });
    
    // Should show "no files" message
    await waitFor(() => {
      expect(screen.getByText(/No files found/i)).toBeInTheDocument();
    });
  });
});
