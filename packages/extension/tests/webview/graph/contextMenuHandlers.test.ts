import { describe, expect, it, vi } from 'vitest';
import type { FGLink } from '../../../src/webview/components/graphModel';
import { createContextMenuHandlers } from '../../../src/webview/components/graph/interactionHandlers/contextMenuHandlers';
import { createInteractionDependencies } from './interactionHandlers.testUtils';

describe('graph/contextMenuHandlers', () => {
  it('updates selection and opens the node context menu', () => {
    const dependencies = createInteractionDependencies();
    const setSelection = vi.fn();
    const dispatchEvent = vi.spyOn(dependencies.containerRef.current, 'dispatchEvent');
    const handlers = createContextMenuHandlers(dependencies, setSelection);

    handlers.openNodeContextMenu(
      'src/app.ts',
      new MouseEvent('contextmenu', { button: 2, buttons: 2, clientX: 24, clientY: 32 }),
    );

    expect(setSelection).toHaveBeenCalledWith(['src/app.ts']);
    expect(dependencies.setContextSelection).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'node', targets: ['src/app.ts'] }),
    );
    expect(dispatchEvent).toHaveBeenCalledOnce();
  });

  it('does not dispatch when the graph container is missing', () => {
    const dependencies = createInteractionDependencies();
    const container = dependencies.containerRef.current;
    const dispatchEvent = vi.spyOn(container, 'dispatchEvent');
    dependencies.containerRef.current = null;
    const handlers = createContextMenuHandlers(dependencies, vi.fn());

    expect(() => {
      handlers.openBackgroundContextMenu(
        new MouseEvent('contextmenu', {
          button: 2,
          buttons: 2,
          clientX: 12,
          clientY: 16,
          ctrlKey: true,
        }),
      );
    }).not.toThrow();
    expect(dependencies.setContextSelection).toHaveBeenCalledWith({
      kind: 'background',
      targets: [],
    });
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it('preserves pointer metadata on the synthetic context menu event', () => {
    const dependencies = createInteractionDependencies();
    const dispatchEvent = vi.spyOn(dependencies.containerRef.current, 'dispatchEvent');
    const handlers = createContextMenuHandlers(dependencies, vi.fn());

    handlers.openBackgroundContextMenu(
      new MouseEvent('contextmenu', {
        button: 2,
        buttons: 2,
        clientX: 48,
        clientY: 64,
        ctrlKey: true,
      }),
    );

    const syntheticEvent = dispatchEvent.mock.calls[0]?.[0] as MouseEvent | undefined;

    expect(syntheticEvent).toBeDefined();
    expect(syntheticEvent?.type).toBe('contextmenu');
    expect(syntheticEvent?.button).toBe(2);
    expect(syntheticEvent?.buttons).toBe(2);
    expect(syntheticEvent?.clientX).toBe(48);
    expect(syntheticEvent?.clientY).toBe(64);
    expect(syntheticEvent?.ctrlKey).toBe(true);
    expect(syntheticEvent?.bubbles).toBe(true);
    expect(syntheticEvent?.cancelable).toBe(true);
  });

  it('falls back to default pointer metadata when the graph callback omits the event', () => {
    const dependencies = createInteractionDependencies();
    const dispatchEvent = vi.spyOn(dependencies.containerRef.current, 'dispatchEvent');
    const handlers = createContextMenuHandlers(dependencies, vi.fn());

    handlers.openBackgroundContextMenu(undefined as unknown as MouseEvent);

    const syntheticEvent = dispatchEvent.mock.calls[0]?.[0] as MouseEvent | undefined;

    expect(syntheticEvent).toBeDefined();
    expect(syntheticEvent?.clientX).toBe(0);
    expect(syntheticEvent?.clientY).toBe(0);
    expect(syntheticEvent?.ctrlKey).toBe(false);
  });

  it('keeps the existing selection when opening a selected node context menu', () => {
    const dependencies = createInteractionDependencies();
    dependencies.selectedNodesSetRef.current = new Set(['src/app.ts', 'src/utils.ts']);
    const setSelection = vi.fn();
    const dispatchEvent = vi.spyOn(dependencies.containerRef.current, 'dispatchEvent');
    const handlers = createContextMenuHandlers(dependencies, setSelection);

    handlers.openNodeContextMenu(
      'src/app.ts',
      new MouseEvent('contextmenu', { button: 2, buttons: 2 }),
    );

    expect(setSelection).not.toHaveBeenCalled();
    expect(dependencies.setContextSelection).toHaveBeenCalledWith({
      kind: 'node',
      targets: ['src/app.ts', 'src/utils.ts'],
    });
    expect(dispatchEvent).toHaveBeenCalledOnce();
  });

  it('opens edge and background context menus', () => {
    const dependencies = createInteractionDependencies();
    const dispatchEvent = vi.spyOn(dependencies.containerRef.current, 'dispatchEvent');
    const handlers = createContextMenuHandlers(dependencies, vi.fn());

    handlers.openEdgeContextMenu(
      {
        id: 'src/app.ts->src/utils.ts',
        from: 'src/app.ts',
        to: 'src/utils.ts',
        source: 'src/app.ts',
        target: 'src/utils.ts',
      } as FGLink,
      new MouseEvent('contextmenu', { button: 2, buttons: 2 }),
    );
    handlers.openBackgroundContextMenu(
      new MouseEvent('contextmenu', { button: 2, buttons: 2 }),
    );

    expect(dependencies.setContextSelection).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ kind: 'edge' }),
    );
    expect(dependencies.setContextSelection).toHaveBeenNthCalledWith(
      2,
      { kind: 'background', targets: [] },
    );
    expect(dispatchEvent).toHaveBeenCalledTimes(2);
  });

  it.each([
    [
      'source',
      {
        id: 'src/app.ts->src/utils.ts',
        from: {},
        to: 'src/utils.ts',
        source: {},
        target: 'src/utils.ts',
      },
    ],
    [
      'target',
      {
        id: 'src/app.ts->src/utils.ts',
        from: 'src/app.ts',
        to: {},
        source: 'src/app.ts',
        target: {},
      },
    ],
  ])(
    'does not open the edge context menu when the %s endpoint cannot be resolved',
    (_endpoint, link) => {
      const dependencies = createInteractionDependencies();
      const dispatchEvent = vi.spyOn(dependencies.containerRef.current, 'dispatchEvent');
      const handlers = createContextMenuHandlers(dependencies, vi.fn());

      handlers.openEdgeContextMenu(
        link as FGLink,
        new MouseEvent('contextmenu', { button: 2, buttons: 2 }),
      );

      expect(dependencies.setContextSelection).not.toHaveBeenCalled();
      expect(dependencies.lastGraphContextEventRef.current).toBe(0);
      expect(dispatchEvent).not.toHaveBeenCalled();
    },
  );
});
