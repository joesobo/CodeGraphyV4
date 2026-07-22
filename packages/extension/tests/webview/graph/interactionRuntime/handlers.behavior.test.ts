import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FGNode } from '../../../../src/webview/components/graph/model/build';
import { createGraphInteractionHandlers } from '../../../../src/webview/components/graph/interactionRuntime/handlers';
import { clearSentMessages, findMessage, getSentMessages } from '../../../helpers/sentMessages';
import { createDependencies, createRef } from './handlersFixture';

describe('graph interaction handlers', () => {
  beforeEach(() => {
    clearSentMessages();
    vi.clearAllMocks();
  });
  it('applies the graph cursor to the container surface when available', () => {
    const dependencies = createDependencies();
    const canvas = document.createElement('canvas');
    const child = document.createElement('div');
    dependencies.containerRef.current?.append(canvas, child);
    const handlers = createGraphInteractionHandlers(dependencies);

    handlers.setGraphCursor('pointer');

    expect(dependencies.graphCursorRef.current).toBe('pointer');
    expect(dependencies.containerRef.current?.style.cursor).toBe('pointer');
    expect(canvas.style.cursor).toBe('pointer');
    expect(child.style.cursor).toBe('pointer');
  });

  it('updates the cursor ref without touching the dom when no container exists', () => {
    const dependencies = createDependencies({
      containerRef: createRef<HTMLDivElement | null>(null),
    });
    const handlers = createGraphInteractionHandlers(dependencies);

    expect(() => {
      handlers.setGraphCursor('pointer');
    }).not.toThrow();
    expect(dependencies.graphCursorRef.current).toBe('pointer');
  });

  it('updates node selection and opens the node context menu', () => {
    const dependencies = createDependencies();
    const dispatchEvent = vi.spyOn(dependencies.containerRef.current as EventTarget, 'dispatchEvent');
    const handlers = createGraphInteractionHandlers(dependencies);
    const event = new MouseEvent('contextmenu', {
      button: 2,
      buttons: 2,
      clientX: 24,
      clientY: 32,
    });

    handlers.openNodeContextMenu('src/app.ts', event);

    expect(dependencies.selectedNodesSetRef.current).toEqual(new Set(['src/app.ts']));
    expect(dependencies.setSelectedNodes).toHaveBeenCalledWith(['src/app.ts']);
    expect(dependencies.setContextSelection).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'node',
        targets: ['src/app.ts'],
      }),
    );
    expect(dispatchEvent).toHaveBeenCalledOnce();
    expect(dependencies.lastGraphContextEventRef.current).toBeGreaterThan(0);
  });

  it('focuses nodes in the owned 2d graph', () => {
    const dependencies = createDependencies();
    const handlers = createGraphInteractionHandlers(dependencies);

    handlers.focusNodeById('src/app.ts');

    expect(dependencies.fg2dRef.current?.centerAt).toHaveBeenCalledWith(0, 0, 300);
    expect(dependencies.fg2dRef.current?.zoom).toHaveBeenCalledWith(1.5, 300);
  });

  it('handles node clicks through the interaction model and effect runner', () => {
    const dependencies = createDependencies();
    const handlers = createGraphInteractionHandlers(dependencies);
    const event = new MouseEvent('click', {
      clientX: 100,
      clientY: 100,
    });

    handlers.handleNodeClick(
      { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' } as FGNode,
      event,
    );
    handlers.handleNodeClick(
      { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' } as FGNode,
      event,
    );

    expect(findMessage('NODE_SELECTED')?.payload.nodeId).toBe('src/app.ts');
    expect(findMessage('NODE_DOUBLE_CLICKED')?.payload.nodeId).toBe('src/app.ts');
    expect(dependencies.fg2dRef.current?.centerAt).toHaveBeenCalledWith(0, 0, 300);
    expect(dependencies.fg2dRef.current?.zoom).toHaveBeenCalledWith(1.5, 300);
    expect(
      getSentMessages().some(
        message =>
          message.type === 'GRAPH_INTERACTION'
          && message.payload.event === 'graph:nodeDoubleClick',
      ),
    ).toBe(true);
  });

  it('clears graph selection when background click runs without an event', () => {
    const dependencies = createDependencies();
    dependencies.selectedNodesSetRef.current = new Set(['src/app.ts']);
    const handlers = createGraphInteractionHandlers(dependencies);

    handlers.handleBackgroundClick();

    expect(dependencies.graphCursorRef.current).toBe('default');
    expect(dependencies.highlightedNodeRef.current).toBeNull();
    expect(dependencies.selectedNodesSetRef.current.size).toBe(0);
    expect(dependencies.setSelectedNodes).toHaveBeenCalledWith([]);
    expect(findMessage('CLEAR_FOCUSED_FILE')).toEqual({ type: 'CLEAR_FOCUSED_FILE' });
    expect(
      getSentMessages().some(
        message =>
          message.type === 'GRAPH_INTERACTION'
          && message.payload.event === 'graph:backgroundClick',
      ),
    ).toBe(true);
  });

  it('clears the focused file when re-clicking the only selected node outside double-click timing', () => {
    const dependencies = createDependencies();
    const handlers = createGraphInteractionHandlers(dependencies);
    const event = new MouseEvent('click', {
      clientX: 100,
      clientY: 100,
    });
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(100);
    handlers.handleNodeClick(
      { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' } as FGNode,
      event,
    );
    clearSentMessages();
    nowSpy.mockReturnValueOnce(1000);

    handlers.handleNodeClick(
      { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' } as FGNode,
      event,
    );

    expect(dependencies.selectedNodesSetRef.current.size).toBe(0);
    expect(dependencies.setSelectedNodes).toHaveBeenLastCalledWith([]);
    expect(findMessage('CLEAR_FOCUSED_FILE')).toEqual({ type: 'CLEAR_FOCUSED_FILE' });
    nowSpy.mockRestore();
  });

});
