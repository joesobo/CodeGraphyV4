import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../../../src/webview/app/view';
import { graphStore } from '../../../../../src/webview/store/state';
import { messageListeners, resetStore, sendMessage } from './fixture';

describe('App plugin startup',()=>{
  beforeEach(()=>{ messageListeners.length=0; delete (window as Window & { __codegraphyWebviewReadyPosted?: boolean }).__codegraphyWebviewReadyPosted; resetStore(); vi.useRealTimers(); });
  afterEach(()=>vi.useRealTimers());

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
});
