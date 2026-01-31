/**
 * Integration tests for webview-extension message flow.
 * These tests verify the complete data pipeline from webview ready to graph display.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import App from '../../src/webview/App';

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

describe('Webview-Extension Integration', () => {
  beforeEach(() => {
    messageListeners.length = 0;
    postMessageSpy.mockClear();
  });

  it('should send WEBVIEW_READY on mount', async () => {
    await act(async () => {
      render(<App />);
    });
    
    expect(postMessageSpy).toHaveBeenCalledWith({ type: 'WEBVIEW_READY' });
  });

  it('should show loading state until GRAPH_DATA_UPDATED is received', async () => {
    render(<App />);
    
    // Should be in loading state
    expect(screen.getByText('Loading graph...')).toBeInTheDocument();
    
    // Simulate extension responding with graph data
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
    
    // Should no longer be loading
    await waitFor(() => {
      expect(screen.queryByText('Loading graph...')).not.toBeInTheDocument();
    });
  });

  it('should complete full message flow: WEBVIEW_READY → GRAPH_DATA_UPDATED → render', async () => {
    await act(async () => {
      render(<App />);
    });
    
    // 1. Webview should send WEBVIEW_READY
    expect(postMessageSpy).toHaveBeenCalledWith({ type: 'WEBVIEW_READY' });
    
    // 2. Simulate extension processing and responding
    const graphDataEvent = new MessageEvent('message', {
      data: {
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
      },
    });
    
    await act(async () => {
      messageListeners.forEach((listener) => listener(graphDataEvent));
    });
    
    // 3. Graph should render (loading gone, graph container present)
    await waitFor(() => {
      expect(screen.queryByText('Loading graph...')).not.toBeInTheDocument();
    });
  });

  it('should handle empty graph data gracefully', async () => {
    render(<App />);
    
    // Send empty graph data
    const emptyDataEvent = new MessageEvent('message', {
      data: {
        type: 'GRAPH_DATA_UPDATED',
        payload: {
          nodes: [],
          edges: [],
        },
      },
    });
    
    await act(async () => {
      messageListeners.forEach((listener) => listener(emptyDataEvent));
    });
    
    // Should show "no files" message
    await waitFor(() => {
      expect(screen.getByText(/No files found/i)).toBeInTheDocument();
    });
  });
});
