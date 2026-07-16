import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../../../src/webview/app/view';
import { messageListeners, resetStore, sendMessage } from './fixture';

describe('App graph controls',()=>{
  beforeEach(()=>{ messageListeners.length=0; delete (window as Window & { __codegraphyWebviewReadyPosted?: boolean }).__codegraphyWebviewReadyPosted; resetStore(); vi.useRealTimers(); });
  afterEach(()=>vi.useRealTimers());

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
});
