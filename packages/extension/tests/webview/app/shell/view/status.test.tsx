import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../../../src/webview/app/view';
import { messageListeners, resetStore, sendMessage } from './fixture';

describe('App graph status',()=>{
  beforeEach(()=>{ messageListeners.length=0; delete (window as Window & { __codegraphyWebviewReadyPosted?: boolean }).__codegraphyWebviewReadyPosted; resetStore(); vi.useRealTimers(); });
  afterEach(()=>vi.useRealTimers());

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
});
