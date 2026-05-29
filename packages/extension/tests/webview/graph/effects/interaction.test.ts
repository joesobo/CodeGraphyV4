import { describe, expect, it, vi } from 'vitest';
import { applyInteractionEffects } from '../../../../src/webview/components/graph/effects/interaction';

type TestLink = { id: string };

function createHandlers() {
  return {
    openNodeContextMenu: vi.fn(),
    openBackgroundContextMenu: vi.fn(),
    openEdgeContextMenu: vi.fn(),
    selectOnlyNode: vi.fn(),
    setSelection: vi.fn(),
    clearSelection: vi.fn(),
    clearFocusedFile: vi.fn(),
    previewNode: vi.fn(),
    openNode: vi.fn(),
    focusNode: vi.fn(),
    sendInteraction: vi.fn(),
  };
}

describe('graph effects interaction', () => {
  it('opens a node context menu when the event is available', () => {
    const handlers = createHandlers();
    const event = new MouseEvent('click');

    applyInteractionEffects(
      [{ kind: 'openNodeContextMenu', nodeId: 'src/app.ts' }],
      handlers,
      { event }
    );

    expect(handlers.openNodeContextMenu).toHaveBeenCalledWith('src/app.ts', event);
  });

  it('skips node context menu when the event is missing', () => {
    const handlers = createHandlers();

    applyInteractionEffects([{ kind: 'openNodeContextMenu', nodeId: 'src/app.ts' }], handlers);

    expect(handlers.openNodeContextMenu).not.toHaveBeenCalled();
  });

  it('opens an edge context menu only when both event and link exist', () => {
    const handlers = createHandlers();
    const event = new MouseEvent('click');
    const link: TestLink = { id: 'a->b' };

    applyInteractionEffects(
      [{ kind: 'openEdgeContextMenu' }],
      handlers,
      { event, link }
    );

    expect(handlers.openEdgeContextMenu).toHaveBeenCalledWith(link, event);
  });

  it('does not open an edge context menu when only the event or only the link exists', () => {
    const handlers = createHandlers();
    const event = new MouseEvent('click');
    const link: TestLink = { id: 'a->b' };

    applyInteractionEffects([{ kind: 'openEdgeContextMenu' }], handlers, { event });
    applyInteractionEffects([{ kind: 'openEdgeContextMenu' }], handlers, { link });

    expect(handlers.openEdgeContextMenu).not.toHaveBeenCalled();
  });

  it('opens the background context menu only when an event is available', () => {
    const handlers = createHandlers();
    const event = new MouseEvent('click');

    applyInteractionEffects([{ kind: 'openBackgroundContextMenu' }], handlers, { event });
    applyInteractionEffects([{ kind: 'openBackgroundContextMenu' }], handlers);

    expect(handlers.openBackgroundContextMenu).toHaveBeenCalledOnce();
    expect(handlers.openBackgroundContextMenu).toHaveBeenCalledWith(event);
  });

  it('sets the full selection list', () => {
    const handlers = createHandlers();

    applyInteractionEffects([{ kind: 'setSelection', nodeIds: ['a', 'b'] }], handlers);

    expect(handlers.setSelection).toHaveBeenCalledWith(['a', 'b']);
  });

  it('clears the selection', () => {
    const handlers = createHandlers();

    applyInteractionEffects([{ kind: 'clearSelection' }], handlers);

    expect(handlers.clearSelection).toHaveBeenCalledOnce();
  });

  it('clears the focused file', () => {
    const handlers = createHandlers();

    applyInteractionEffects([{ kind: 'clearFocusedFile' }], handlers);

    expect(handlers.clearFocusedFile).toHaveBeenCalledOnce();
  });

  it('previews the node', () => {
    const handlers = createHandlers();

    applyInteractionEffects([{ kind: 'previewNode', nodeId: 'src/app.ts' }], handlers);

    expect(handlers.previewNode).toHaveBeenCalledWith('src/app.ts');
  });

  it('opens the node directly', () => {
    const handlers = createHandlers();

    applyInteractionEffects([{ kind: 'openNode', nodeId: 'src/app.ts' }], handlers);

    expect(handlers.openNode).toHaveBeenCalledWith('src/app.ts');
  });

  it('focuses the node', () => {
    const handlers = createHandlers();

    applyInteractionEffects([{ kind: 'focusNode', nodeId: 'src/app.ts' }], handlers);

    expect(handlers.focusNode).toHaveBeenCalledWith('src/app.ts');
  });

  it('forwards interaction payloads', () => {
    const handlers = createHandlers();

    applyInteractionEffects(
      [{ kind: 'sendInteraction', event: 'graph:nodeClick', payload: { node: 'src/app.ts' } }],
      handlers
    );

    expect(handlers.sendInteraction).toHaveBeenCalledWith('graph:nodeClick', { node: 'src/app.ts' });
  });
});
