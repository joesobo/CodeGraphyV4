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

  it('continues applying context effects when a graph view plugin action throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handlers = createHandlers();
    const context = {
      target: { kind: 'background' as const },
      selectedNodeIds: [],
      selectedEdgeIds: [],
    };

    expect(() => applyContextEffects([
      {
        kind: 'runGraphViewContextMenuContribution',
        pluginId: 'broken.plugin',
        contributionId: 'broken-action',
        context,
        run() {
          throw new Error('run failed');
        },
      },
      { kind: 'focusNode', nodeId: 'src/app.ts' },
    ], handlers)).not.toThrow();

    await vi.waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Context menu contribution 'broken-action' from plugin 'broken.plugin' failed"),
        expect.any(Error),
      );
    });
    expect(handlers.focusNode).toHaveBeenCalledWith('src/app.ts');
  });

  it('reports rejected graph view plugin actions', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handlers = createHandlers();

    applyContextEffects([{
      kind: 'runGraphViewContextMenuContribution',
      pluginId: 'broken.plugin',
      contributionId: 'rejected-action',
      context: {
        target: { kind: 'background' },
        selectedNodeIds: [],
        selectedEdgeIds: [],
      },
      async run() {
        throw new Error('action rejected');
      },
    }], handlers);

    await vi.waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Context menu contribution 'rejected-action' from plugin 'broken.plugin' failed"),
        expect.any(Error),
      );
    });
  });
});
