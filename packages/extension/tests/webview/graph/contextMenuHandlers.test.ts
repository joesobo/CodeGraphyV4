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
});
