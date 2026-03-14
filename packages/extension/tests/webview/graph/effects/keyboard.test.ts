import { describe, expect, it, vi } from 'vitest';
import { applyKeyboardEffects } from '../../../../src/webview/components/graph/effects/keyboard';
import type { GraphKeyboardEffect } from '../../../../src/webview/components/graphKeyboardEffects';

function createHandlers() {
  return {
    fitView: vi.fn(),
    clearSelection: vi.fn(),
    openSelectedNodes: vi.fn(),
    selectAll: vi.fn(),
    zoom2d: vi.fn(),
    postMessage: vi.fn(),
    dispatchStoreMessage: vi.fn(),
  };
}

describe('graph effects keyboard', () => {
  it('fits the view', () => {
    const handlers = createHandlers();

    applyKeyboardEffects([{ kind: 'fitView' }], handlers);

    expect(handlers.fitView).toHaveBeenCalledOnce();
  });

  it('clears the selection', () => {
    const handlers = createHandlers();

    applyKeyboardEffects([{ kind: 'clearSelection' }], handlers);

    expect(handlers.clearSelection).toHaveBeenCalledOnce();
  });

  it('opens selected nodes', () => {
    const handlers = createHandlers();

    applyKeyboardEffects([{ kind: 'openSelectedNodes', nodeIds: ['a', 'b'] }], handlers);

    expect(handlers.openSelectedNodes).toHaveBeenCalledWith(['a', 'b']);
  });

  it('selects all nodes', () => {
    const handlers = createHandlers();

    applyKeyboardEffects([{ kind: 'selectAll', nodeIds: ['a', 'b'] }], handlers);

    expect(handlers.selectAll).toHaveBeenCalledWith(['a', 'b']);
  });

  it('zooms the 2d graph', () => {
    const handlers = createHandlers();

    applyKeyboardEffects([{ kind: 'zoom', factor: 1.2 }], handlers);

    expect(handlers.zoom2d).toHaveBeenCalledWith(1.2);
  });

  it('posts extension messages', () => {
    const handlers = createHandlers();
    const effect: GraphKeyboardEffect = { kind: 'postMessage', message: { type: 'UNDO' } };

    applyKeyboardEffects([effect], handlers);

    expect(handlers.postMessage).toHaveBeenCalledWith({ type: 'UNDO' });
  });

  it('dispatches store messages', () => {
    const handlers = createHandlers();
    const effect: GraphKeyboardEffect = {
      kind: 'dispatchStoreMessage',
      message: { type: 'CYCLE_LAYOUT' },
    };

    applyKeyboardEffects([effect], handlers);

    expect(handlers.dispatchStoreMessage).toHaveBeenCalledWith({ type: 'CYCLE_LAYOUT' });
  });
});
