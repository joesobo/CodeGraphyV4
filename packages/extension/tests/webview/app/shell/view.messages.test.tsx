import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../../src/webview/app/view';
import { graphStore } from '../../../../src/webview/store/state';
import { messageListeners, resetStore, sendMessage } from './view/fixture';

describe('App: message handlers', () => {
  beforeEach(() => {
    messageListeners.length = 0;
    delete (window as Window & { __codegraphyWebviewReadyPosted?: boolean })
      .__codegraphyWebviewReadyPosted;
    resetStore();
    vi.useRealTimers();
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
      sendMessage({
        type: 'FILTER_PATTERNS_UPDATED',
        payload: {
          patterns: ['**/*.test.ts'],
          pluginPatterns: [],
          pluginPatternGroups: [],
          disabledCustomPatterns: [],
          disabledPluginPatterns: [],
        },
      });
    });
    expect(graphStore.getState().filterPatterns).toEqual(['**/*.test.ts']);
  });

  it('LEGENDS_UPDATED message is handled', async () => {
    render(<App />);
    await act(async () => {
      sendMessage({
        type: 'LEGENDS_UPDATED',
        payload: { legends: [{ id: 'g1', pattern: 'src/**', color: '#ff0000' }] },
      });
    });
    expect(graphStore.getState().legends).toEqual([{ id: 'g1', pattern: 'src/**', color: '#ff0000' }]);
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
