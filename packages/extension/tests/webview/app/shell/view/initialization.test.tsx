import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../../../src/webview/app/view';
import { messageListeners, resetStore, sendMessage } from './fixture';

describe('App initialization',()=>{
  beforeEach(()=>{ messageListeners.length=0; delete (window as Window & { __codegraphyWebviewReadyPosted?: boolean }).__codegraphyWebviewReadyPosted; resetStore(); vi.useRealTimers(); });
  afterEach(()=>vi.useRealTimers());

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
});
