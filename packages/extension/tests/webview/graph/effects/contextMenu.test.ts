import { describe, expect, it, vi } from 'vitest';
import { applyContextEffects } from '../../../../src/webview/components/graph/effects/contextMenu';
import type { GraphContextEffect } from '../../../../src/webview/components/graph/contextActions/effects';

function createHandlers() {
  return {
    clearCachedFile: vi.fn(),
    focusNode: vi.fn(),
    fitView: vi.fn(),
    postMessage: vi.fn(),
  };
}

describe('graph effects context menu', () => {
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
});
