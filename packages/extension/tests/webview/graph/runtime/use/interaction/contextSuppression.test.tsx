import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FGLink, FGNode } from '../../../../../../src/webview/components/graph/model/build';
import {
  createSuppressedContextMenuHandlers,
  useContextMenuSuppression,
} from '../../../../../../src/webview/components/graph/runtime/use/interaction/contextSuppression';

function createOpeningRuntime() {
  return {
    handleBackgroundRightClick: vi.fn(),
    handleContextMenu: vi.fn(),
    handleLinkRightClick: vi.fn(),
    handleNodeRightClick: vi.fn(),
  };
}

describe('graph/runtime/use/interaction context suppression', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('forwards context-menu calls while no drag suppression is active', () => {
    const openingRuntime = createOpeningRuntime();
    const { result } = renderHook(() => useContextMenuSuppression());
    const handlers = createSuppressedContextMenuHandlers(openingRuntime as never, result.current);
    const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() };

    handlers.handleContextMenu(event as never);
    handlers.handleBackgroundRightClick({ type: 'background' } as never);
    handlers.handleLinkRightClick({ id: 'edge' } as FGLink, { type: 'link' } as never);
    handlers.handleNodeRightClick({ id: 'node' } as FGNode, { type: 'node' } as never);

    expect(openingRuntime.handleContextMenu).toHaveBeenCalledTimes(1);
    expect(openingRuntime.handleBackgroundRightClick).toHaveBeenCalledTimes(1);
    expect(openingRuntime.handleLinkRightClick).toHaveBeenCalledWith({ id: 'edge' }, { type: 'link' });
    expect(openingRuntime.handleNodeRightClick).toHaveBeenCalledWith({ id: 'node' }, { type: 'node' });
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopPropagation).not.toHaveBeenCalled();
  });

  it('blocks context-menu calls during the drag suppression window', () => {
    const openingRuntime = createOpeningRuntime();
    const { result } = renderHook(() => useContextMenuSuppression());
    const handlers = createSuppressedContextMenuHandlers(openingRuntime as never, result.current);
    const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() };

    result.current.suppressContextMenu();
    handlers.handleContextMenu(event as never);
    handlers.handleBackgroundRightClick({ type: 'background' } as never);
    handlers.handleLinkRightClick({ id: 'edge' } as FGLink, { type: 'link' } as never);
    handlers.handleNodeRightClick({ id: 'node' } as FGNode, { type: 'node' } as never);

    expect(openingRuntime.handleContextMenu).not.toHaveBeenCalled();
    expect(openingRuntime.handleBackgroundRightClick).not.toHaveBeenCalled();
    expect(openingRuntime.handleLinkRightClick).not.toHaveBeenCalled();
    expect(openingRuntime.handleNodeRightClick).not.toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
  });
});
