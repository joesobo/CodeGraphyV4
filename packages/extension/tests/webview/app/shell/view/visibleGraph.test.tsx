import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../../../src/webview/app/view';
import { graphStore } from '../../../../../src/webview/store/state';
import { STRUCTURAL_NESTS_EDGE_KIND } from '../../../../../src/shared/graphControls/defaults/definitions';
import { messageListeners, resetStore, sendMessage } from './fixture';

describe('App visible graph',()=>{
  beforeEach(()=>{ messageListeners.length=0; delete (window as Window & { __codegraphyWebviewReadyPosted?: boolean }).__codegraphyWebviewReadyPosted; resetStore(); vi.useRealTimers(); });
  afterEach(()=>vi.useRealTimers());

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
