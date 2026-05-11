import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FGLink, FGNode } from '../../../../../src/webview/components/graph/model/build';
import { createClickHandlers } from '../../../../../src/webview/components/graph/interactionRuntime/handlers/click';
import { createInteractionDependencies } from '../testUtils';

const interactionHarness = vi.hoisted(() => ({
  getBackgroundClickCommand: vi.fn(),
  getLinkClickCommand: vi.fn(),
  getNodeClickCommand: vi.fn(),
}));

vi.mock('../../../../../src/webview/components/graph/interaction/model', () => ({
  getBackgroundClickCommand: interactionHarness.getBackgroundClickCommand,
  getLinkClickCommand: interactionHarness.getLinkClickCommand,
  getNodeClickCommand: interactionHarness.getNodeClickCommand,
}));

describe('graph/interactionRuntime/click', () => {
  afterEach(() => {
    interactionHarness.getBackgroundClickCommand.mockReset();
    interactionHarness.getLinkClickCommand.mockReset();
    interactionHarness.getNodeClickCommand.mockReset();
    vi.restoreAllMocks();
  });

  it('handles node clicks through the interaction model and stores the returned last-click state', () => {
    const dependencies = createInteractionDependencies({
      isMacPlatform: true,
      lastClickRef: { current: { nodeId: 'src/other.ts', time: 99 } },
      selectedNodesSetRef: { current: new Set(['src/app.ts', 'src/utils.ts']) },
    });
    const applyGraphInteractionEffects = vi.fn();
    const nextLastClick = { nodeId: 'src/app.ts', time: 1234 };
    const effects = [{ kind: 'previewNode', nodeId: 'src/app.ts' }];
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1234);
    interactionHarness.getNodeClickCommand.mockReturnValue({
      effects,
      nextLastClick,
    });
    const handlers = createClickHandlers(dependencies, {
      applyGraphInteractionEffects,
      setGraphCursor: vi.fn(),
    });
    const event = new MouseEvent('click', {
      clientX: 100,
      clientY: 200,
      ctrlKey: true,
      metaKey: true,
      shiftKey: true,
    });
    const node = { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' } as FGNode;

    handlers.handleNodeClick(node, event);

    expect(nowSpy).toHaveBeenCalled();
    expect(interactionHarness.getNodeClickCommand).toHaveBeenCalledWith({
      clientX: 100,
      clientY: 200,
      ctrlKey: true,
      doubleClickThresholdMs: 450,
      isMacPlatform: true,
      label: 'app.ts',
      lastClick: { nodeId: 'src/other.ts', time: 99 },
      metaKey: true,
      nodeId: 'src/app.ts',
      now: 1234,
      selectedNodeIds: dependencies.selectedNodesSetRef.current,
      shiftKey: true,
    });
    expect(dependencies.lastClickRef.current).toEqual(nextLastClick);
    expect(applyGraphInteractionEffects).toHaveBeenCalledWith(effects, { event });
  });

  it('handles an eventless background click with non-modifier defaults', () => {
    const dependencies = createInteractionDependencies({ isMacPlatform: true });
    const applyGraphInteractionEffects = vi.fn();
    const setGraphCursor = vi.fn();
    const effects = [{ kind: 'clearSelection' }];
    interactionHarness.getBackgroundClickCommand.mockReturnValue(effects);
    const handlers = createClickHandlers(dependencies, {
      applyGraphInteractionEffects,
      setGraphCursor,
    });

    handlers.handleBackgroundClick();

    expect(setGraphCursor).toHaveBeenCalledWith('default');
    expect(interactionHarness.getBackgroundClickCommand).toHaveBeenCalledWith({
      ctrlKey: false,
      isMacPlatform: false,
    });
    expect(applyGraphInteractionEffects).toHaveBeenCalledWith(effects);
  });

  it('handles a background click event using the event modifier keys and platform flag', () => {
    const dependencies = createInteractionDependencies({ isMacPlatform: true });
    const applyGraphInteractionEffects = vi.fn();
    const setGraphCursor = vi.fn();
    const effects = [{ kind: 'openBackgroundContextMenu' }];
    const event = new MouseEvent('click', { ctrlKey: true });
    interactionHarness.getBackgroundClickCommand.mockReturnValue(effects);
    const handlers = createClickHandlers(dependencies, {
      applyGraphInteractionEffects,
      setGraphCursor,
    });

    handlers.handleBackgroundClick(event);

    expect(setGraphCursor).toHaveBeenCalledWith('default');
    expect(interactionHarness.getBackgroundClickCommand).toHaveBeenCalledWith({
      ctrlKey: true,
      isMacPlatform: true,
    });
    expect(applyGraphInteractionEffects).toHaveBeenCalledWith(effects, { event });
  });

  it('ignores mac ctrl-background-click while context menus are suppressed after a pan drag', () => {
    const dependencies = createInteractionDependencies({
      isContextMenuSuppressed: () => true,
      isMacPlatform: true,
    });
    const applyGraphInteractionEffects = vi.fn();
    const setGraphCursor = vi.fn();
    const event = {
      ctrlKey: true,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as MouseEvent;
    const handlers = createClickHandlers(dependencies, {
      applyGraphInteractionEffects,
      setGraphCursor,
    });

    handlers.handleBackgroundClick(event);

    expect(setGraphCursor).toHaveBeenCalledWith('default');
    expect(interactionHarness.getBackgroundClickCommand).not.toHaveBeenCalled();
    expect(applyGraphInteractionEffects).not.toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
  });

  it('handles link clicks through the interaction model with the clicked link and event', () => {
    const dependencies = createInteractionDependencies({ isMacPlatform: true });
    const applyGraphInteractionEffects = vi.fn();
    const link = {
      id: 'src/app.ts->src/utils.ts',
      from: 'src/app.ts',
      to: 'src/utils.ts',
    } as FGLink;
    const event = new MouseEvent('click', { ctrlKey: true });
    const effects = [{ kind: 'openEdgeContextMenu' }];
    interactionHarness.getLinkClickCommand.mockReturnValue(effects);
    const handlers = createClickHandlers(dependencies, {
      applyGraphInteractionEffects,
      setGraphCursor: vi.fn(),
    });

    handlers.handleLinkClick(link, event);

    expect(interactionHarness.getLinkClickCommand).toHaveBeenCalledWith({
      ctrlKey: true,
      isMacPlatform: true,
    });
    expect(applyGraphInteractionEffects).toHaveBeenCalledWith(effects, { event, link });
  });

  it('ignores mac ctrl-node-click while context menus are suppressed after a pan drag', () => {
    const dependencies = createInteractionDependencies({
      isContextMenuSuppressed: () => true,
      isMacPlatform: true,
    });
    const applyGraphInteractionEffects = vi.fn();
    const event = {
      clientX: 100,
      clientY: 200,
      ctrlKey: true,
      metaKey: false,
      preventDefault: vi.fn(),
      shiftKey: false,
      stopPropagation: vi.fn(),
    } as unknown as MouseEvent;
    const handlers = createClickHandlers(dependencies, {
      applyGraphInteractionEffects,
      setGraphCursor: vi.fn(),
    });

    handlers.handleNodeClick({ id: 'src/app.ts', label: 'app.ts' } as FGNode, event);

    expect(interactionHarness.getNodeClickCommand).not.toHaveBeenCalled();
    expect(applyGraphInteractionEffects).not.toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
  });

  it('toggles a folder collapse indicator click without running normal node click behavior', () => {
    const toggleFolderCollapse = vi.fn();
    const dependencies = createInteractionDependencies({
      fg2dRef: {
        current: {
          graph2ScreenCoords: vi.fn((x: number, y: number) => ({ x, y })),
        } as never,
      },
      toggleFolderCollapse,
    });
    const applyGraphInteractionEffects = vi.fn();
    const event = {
      clientX: 88,
      clientY: 88,
      ctrlKey: false,
      metaKey: false,
      preventDefault: vi.fn(),
      shiftKey: false,
      stopPropagation: vi.fn(),
    } as unknown as MouseEvent;
    const handlers = createClickHandlers(dependencies, {
      applyGraphInteractionEffects,
      setGraphCursor: vi.fn(),
    });

    handlers.handleNodeClick({
      id: 'src',
      label: 'src',
      isCollapsible: true,
      isCollapsed: false,
      nodeType: 'folder',
      size: 20,
      x: 100,
      y: 100,
    } as FGNode, event);

    expect(toggleFolderCollapse).toHaveBeenCalledWith('src', true);
    expect(interactionHarness.getNodeClickCommand).not.toHaveBeenCalled();
    expect(applyGraphInteractionEffects).not.toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
  });

  it('ignores mac ctrl-link-click while context menus are suppressed after a pan drag', () => {
    const dependencies = createInteractionDependencies({
      isContextMenuSuppressed: () => true,
      isMacPlatform: true,
    });
    const applyGraphInteractionEffects = vi.fn();
    const link = {
      id: 'src/app.ts->src/utils.ts',
      from: 'src/app.ts',
      to: 'src/utils.ts',
    } as FGLink;
    const event = {
      ctrlKey: true,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as MouseEvent;
    const handlers = createClickHandlers(dependencies, {
      applyGraphInteractionEffects,
      setGraphCursor: vi.fn(),
    });

    handlers.handleLinkClick(link, event);

    expect(interactionHarness.getLinkClickCommand).not.toHaveBeenCalled();
    expect(applyGraphInteractionEffects).not.toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
  });
});
