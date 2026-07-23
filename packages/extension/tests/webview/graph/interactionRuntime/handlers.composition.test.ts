import { describe, expect, it, vi } from 'vitest';
import { createDependencies } from './handlersFixture';

describe('graph interaction handler composition', () => {
  it('wires the composed handler factories and re-exports their handlers', async () => {
    vi.resetModules();

    const selectionHandlers = {
      clearSelection: vi.fn(),
      selectOnlyNode: vi.fn(),
      setHighlight: vi.fn(),
      setSelection: vi.fn(),
    };
    const contextMenuHandlers = {
      openBackgroundContextMenu: vi.fn(),
      openEdgeContextMenu: vi.fn(),
      openNodeContextMenu: vi.fn(),
    };
    const viewHandlers = {
      fitView: vi.fn(),
      focusNodeById: vi.fn(),
      zoomGraphView: vi.fn(),
    };
    const effectHandlers = {
      applyGraphInteractionEffects: vi.fn(),
      previewNode: vi.fn(),
      requestNodeOpenById: vi.fn(),
    };
    const clickHandlers = {
      handleBackgroundClick: vi.fn(),
      handleLinkClick: vi.fn(),
      handleNodeClick: vi.fn(),
    };
    const applyCursorToGraphSurface = vi.fn();
    const createSelectionHandlers = vi.fn(() => selectionHandlers);
    const createContextMenuHandlers = vi.fn(() => contextMenuHandlers);
    const createViewHandlers = vi.fn(() => viewHandlers);
    const createEffectHandlers = vi.fn(() => effectHandlers);
    const createClickHandlers = vi.fn(() => clickHandlers);

    vi.doMock('../../../../src/webview/components/graph/interactionRuntime/handlers/selection', () => ({
      createSelectionHandlers,
    }));
    vi.doMock('../../../../src/webview/components/graph/interactionRuntime/handlers/contextMenu', () => ({
      createContextMenuHandlers,
    }));
    vi.doMock('../../../../src/webview/components/graph/interactionRuntime/handlers/view', () => ({
      createViewHandlers,
    }));
    vi.doMock('../../../../src/webview/components/graph/interactionRuntime/handlers/effects', () => ({
      createEffectHandlers,
    }));
    vi.doMock('../../../../src/webview/components/graph/interactionRuntime/handlers/click', () => ({
      createClickHandlers,
    }));
    vi.doMock('../../../../src/webview/components/graph/support/dom', async () => {
      const actual = await vi.importActual<
        typeof import('../../../../src/webview/components/graph/support/dom')
      >('../../../../src/webview/components/graph/support/dom');
      return {
        ...actual,
        applyCursorToGraphSurface,
      };
    });

    const { createGraphInteractionHandlers: createHandlers } = await import(
      '../../../../src/webview/components/graph/interactionRuntime/handlers'
    );
    const dependencies = createDependencies();
    const handlers = createHandlers(dependencies);
    const clickCallbacks = createClickHandlers.mock.calls[0] as unknown as [
      unknown,
      {
        applyGraphInteractionEffects: typeof effectHandlers.applyGraphInteractionEffects;
        setGraphCursor: typeof applyCursorToGraphSurface;
      },
    ];
    if (!clickCallbacks) {
      throw new Error('missing click handler call');
    }

    expect(createSelectionHandlers).toHaveBeenCalledWith(dependencies);
    expect(createContextMenuHandlers).toHaveBeenCalledWith(
      dependencies,
      selectionHandlers,
    );
    expect(createViewHandlers).toHaveBeenCalledWith(dependencies);
    expect(createEffectHandlers).toHaveBeenCalledWith(dependencies, {
      clearSelection: selectionHandlers.clearSelection,
      focusNodeById: viewHandlers.focusNodeById,
      openBackgroundContextMenu: contextMenuHandlers.openBackgroundContextMenu,
      openEdgeContextMenu: contextMenuHandlers.openEdgeContextMenu,
      openNodeContextMenu: contextMenuHandlers.openNodeContextMenu,
      selectOnlyNode: selectionHandlers.selectOnlyNode,
      setSelection: selectionHandlers.setSelection,
    });
    expect(createClickHandlers).toHaveBeenCalledWith(dependencies, {
      applyGraphInteractionEffects: effectHandlers.applyGraphInteractionEffects,
      setGraphCursor: clickCallbacks[1].setGraphCursor,
    });

    expect(handlers.applyGraphInteractionEffects).toBe(effectHandlers.applyGraphInteractionEffects);
    expect(handlers.clearSelection).toBe(selectionHandlers.clearSelection);
    expect(handlers.fitView).toBe(viewHandlers.fitView);
    expect(handlers.focusNodeById).toBe(viewHandlers.focusNodeById);
    expect(handlers.handleBackgroundClick).toBe(clickHandlers.handleBackgroundClick);
    expect(handlers.handleLinkClick).toBe(clickHandlers.handleLinkClick);
    expect(handlers.handleNodeClick).toBe(clickHandlers.handleNodeClick);
    expect(handlers.openBackgroundContextMenu).toBe(contextMenuHandlers.openBackgroundContextMenu);
    expect(handlers.openEdgeContextMenu).toBe(contextMenuHandlers.openEdgeContextMenu);
    expect(handlers.openNodeContextMenu).toBe(contextMenuHandlers.openNodeContextMenu);
    expect(handlers.previewNode).toBe(effectHandlers.previewNode);
    expect(handlers.requestNodeOpenById).toBe(effectHandlers.requestNodeOpenById);
    expect(handlers.selectOnlyNode).toBe(selectionHandlers.selectOnlyNode);
    expect(handlers.setGraphCursor).toBe(clickCallbacks[1].setGraphCursor);
    expect(handlers.setHighlight).toBe(selectionHandlers.setHighlight);
    expect(handlers.setSelection).toBe(selectionHandlers.setSelection);
    expect(handlers.zoomGraphView).toBe(viewHandlers.zoomGraphView);

    handlers.setGraphCursor('pointer');

    expect(dependencies.graphCursorRef.current).toBe('pointer');
    expect(applyCursorToGraphSurface).toHaveBeenCalledWith(
      dependencies.containerRef.current,
      'pointer',
    );

    vi.doUnmock('../../../../src/webview/components/graph/interactionRuntime/handlers/selection');
    vi.doUnmock('../../../../src/webview/components/graph/interactionRuntime/handlers/contextMenu');
    vi.doUnmock('../../../../src/webview/components/graph/interactionRuntime/handlers/view');
    vi.doUnmock('../../../../src/webview/components/graph/interactionRuntime/handlers/effects');
    vi.doUnmock('../../../../src/webview/components/graph/interactionRuntime/handlers/click');
    vi.doUnmock('../../../../src/webview/components/graph/support/dom');
    vi.resetModules();
});
});
