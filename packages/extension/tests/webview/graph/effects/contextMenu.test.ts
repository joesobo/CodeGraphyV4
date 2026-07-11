import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyContextEffects } from '../../../../src/webview/components/graph/effects/contextMenu';
import type { GraphContextEffect } from '../../../../src/webview/components/graph/contextActions/effects';
import { graphStore } from '../../../../src/webview/store/state';
import { INITIAL_STATE } from '../../../../src/webview/store/initialState';

function createHandlers() {
  return {
    clearCachedFile: vi.fn(),
    focusNode: vi.fn(),
    fitView: vi.fn(),
    postMessage: vi.fn(),
  };
}

describe('graph effects context menu', () => {
  beforeEach(() => {
    graphStore.setState({ ...INITIAL_STATE });
  });

  it('opens files after clearing their cached info', () => {
    const handlers = createHandlers();
    const effects: GraphContextEffect[] = [{ kind: 'openFile', path: 'src/app.ts' }];

    applyContextEffects(effects, handlers);

    expect(handlers.clearCachedFile).toHaveBeenCalledWith('src/app.ts');
    expect(handlers.postMessage).toHaveBeenCalledWith({
      type: 'OPEN_FILE',
      payload: { path: 'src/app.ts' },
    });
  });

  it('focuses a node', () => {
    const handlers = createHandlers();

    applyContextEffects([{ kind: 'focusNode', nodeId: 'src/app.ts' }], handlers);

    expect(handlers.focusNode).toHaveBeenCalledWith('src/app.ts');
  });

  it('fits the graph view', () => {
    const handlers = createHandlers();

    applyContextEffects([{ kind: 'fitView' }], handlers);

    expect(handlers.fitView).toHaveBeenCalledOnce();
  });

  it('posts custom messages', () => {
    const handlers = createHandlers();

    applyContextEffects([{ kind: 'postMessage', message: { type: 'REFRESH_GRAPH' } }], handlers);

    expect(handlers.postMessage).toHaveBeenCalledWith({ type: 'REFRESH_GRAPH' });
  });

  it('updates favorites optimistically when posting favorite toggles', () => {
    const handlers = createHandlers();

    applyContextEffects([{
      kind: 'postMessage',
      message: { type: 'TOGGLE_FAVORITE', payload: { paths: ['src/app.ts'] } },
    }], handlers);

    expect(graphStore.getState().favorites).toEqual(new Set(['src/app.ts']));
    expect(handlers.postMessage).toHaveBeenCalledWith({
      type: 'TOGGLE_FAVORITE',
      payload: { paths: ['src/app.ts'] },
    });
  });

  it('stores and clears the armed comparison file', () => {
    const handlers = createHandlers();

    applyContextEffects([
      { kind: 'setCompareSelectedPath', path: 'src/app.ts' },
    ], handlers);
    expect(graphStore.getState().compareSelectedPath).toBe('src/app.ts');

    applyContextEffects([
      { kind: 'setCompareSelectedPath', path: null },
    ], handlers);
    expect(graphStore.getState().compareSelectedPath).toBeNull();
  });
});
