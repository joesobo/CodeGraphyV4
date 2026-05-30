import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  GraphContextMenuAction,
  GraphContextSelection,
} from '../../../../src/webview/components/graph/contextMenu/contracts';
import type { FGLink, FGNode } from '../../../../src/webview/components/graph/model/build';
import { createGraphContextMenuOpeningRuntime } from '../../../../src/webview/components/graph/contextMenuOpening/runtime';

const openingHarness = vi.hoisted(() => ({
  createGraphContextMenuRuntime: vi.fn(),
  postMessage: vi.fn(),
}));

vi.mock('../../../../src/webview/components/graph/contextMenuRuntime/controller', () => ({
  createGraphContextMenuRuntime: openingHarness.createGraphContextMenuRuntime,
}));

vi.mock('../../../../src/webview/vscodeApi', () => ({
  postMessage: openingHarness.postMessage,
}));

function createContextMenuRuntime() {
  return {
    clearRightClickFallbackTimer: vi.fn(),
    clearTooltipContext: vi.fn(),
    handleContextMenu: vi.fn(),
    handleMenuAction: vi.fn(),
    handleMouseDownCapture: vi.fn(),
    handleMouseMoveCapture: vi.fn(),
    handleMouseUpCapture: vi.fn(),
    applyContextEffects: vi.fn(),
  };
}

function createInteractionHandlers() {
  return {
    fitView: vi.fn(),
    focusNodeById: vi.fn(),
    getBackgroundGraphPosition: vi.fn(() => ({ x: 24, y: -32 })),
    openBackgroundContextMenu: vi.fn(),
    openEdgeContextMenu: vi.fn(),
    openNodeContextMenu: vi.fn(),
  };
}

function createNode(id: string): FGNode {
  return { id } as FGNode;
}

function createLink(id: string): FGLink {
  return { id } as FGLink;
}

function createSelection(targets: string[]): GraphContextSelection {
  return { kind: 'node', targets };
}

function createOpeningOptions(overrides: Record<string, unknown> = {}) {
  const actionContext = {
    mutationDirectory: 'src/app.ts',
    primaryTargetId: 'src/app.ts',
    selectionKind: 'node',
    targetIds: ['src/app.ts'],
  };
  return {
    getActionContext: vi.fn((_selection: GraphContextSelection) => actionContext),
    fileInfoCacheRef: { current: new Map([['src/stale.ts', { path: 'src/stale.ts' }]]) },
    hoveredNodeRef: { current: null },
    interactionHandlers: createInteractionHandlers(),
    lastContainerContextMenuEventRef: { current: 0 },
    lastGraphContextEventRef: { current: 0 },
    refs: {
      rightClickFallbackTimerRef: { current: null },
      rightMouseDownRef: { current: null },
    },
    setContextSelection: vi.fn(),
    setTooltipData: vi.fn(),
    stopTooltipTracking: vi.fn(),
    tooltipTimeoutRef: { current: null },
    ...overrides,
  };
}

describe('graph/contextMenuOpening/runtime', () => {
  beforeEach(() => {
    openingHarness.createGraphContextMenuRuntime.mockReset();
    openingHarness.postMessage.mockReset();
  });

  it('creates context menu runtime dependencies from graph services', () => {
    const contextMenuRuntime = createContextMenuRuntime();
    openingHarness.createGraphContextMenuRuntime.mockReturnValue(contextMenuRuntime);
    const openFilterPatternPrompt = vi.fn();
    const openLegendRulePrompt = vi.fn();
    const options = createOpeningOptions({
      openFilterPatternPrompt,
      openLegendRulePrompt,
    });

    createGraphContextMenuOpeningRuntime(options as never);

    const dependencies = openingHarness.createGraphContextMenuRuntime.mock.calls[0]?.[0];
    dependencies.clearCachedFile('src/stale.ts');
    dependencies.fitView();
    dependencies.focusNode('src/focus.ts');
    dependencies.openBackgroundContextMenu({ type: 'contextmenu' });
    dependencies.openFilterPatternPrompt(['src/**']);
    dependencies.openLegendRulePrompt({ pattern: 'src/**', color: '#808080', target: 'node' });
    dependencies.postMessage({ type: 'REFRESH_GRAPH' });
    dependencies.setContextSelection({ kind: 'background', targets: [] });
    dependencies.setTooltipData({ visible: true });
    dependencies.stopTooltipTracking();

    expect(options.fileInfoCacheRef.current.has('src/stale.ts')).toBe(false);
    expect(options.interactionHandlers.fitView).toHaveBeenCalledTimes(1);
    expect(options.interactionHandlers.focusNodeById).toHaveBeenCalledWith('src/focus.ts');
    expect(options.interactionHandlers.openBackgroundContextMenu).toHaveBeenCalledWith({ type: 'contextmenu' });
    expect(openFilterPatternPrompt).toHaveBeenCalledWith(['src/**']);
    expect(openLegendRulePrompt).toHaveBeenCalledWith({ pattern: 'src/**', color: '#808080', target: 'node' });
    expect(openingHarness.postMessage).toHaveBeenCalledWith({ type: 'REFRESH_GRAPH' });
    expect(options.setContextSelection).toHaveBeenCalledWith({ kind: 'background', targets: [] });
    expect(options.setTooltipData).toHaveBeenCalledWith({ visible: true });
    expect(options.stopTooltipTracking).toHaveBeenCalledTimes(1);
  });

  it('translates menu opening handlers and menu actions', () => {
    const contextMenuRuntime = createContextMenuRuntime();
    openingHarness.createGraphContextMenuRuntime.mockReturnValue(contextMenuRuntime);
    const options = createOpeningOptions();

    const runtime = createGraphContextMenuOpeningRuntime(options as never);
    const action: GraphContextMenuAction = { kind: 'builtin', action: 'focus' };
    const graphEvent = { type: 'contextmenu' } as never;
    const reactContextEvent = { nativeEvent: graphEvent } as never;
    const link = createLink('edge-a');

    runtime.handleMouseDownCapture({
      button: 2,
      clientX: 10,
      clientY: 20,
      ctrlKey: true,
    } as never);
    runtime.handleMouseMoveCapture({
      clientX: 30,
      clientY: 40,
    } as never);
    runtime.handleMouseUpCapture({ button: 2 } as never);
    runtime.handleNodeRightClick(createNode('src/app.ts'), graphEvent);
    runtime.handleLinkRightClick(link, graphEvent);
    runtime.handleBackgroundRightClick(graphEvent);
    runtime.handleContextMenu(reactContextEvent);
    const contextSelection = createSelection(['src/app.ts']);
    runtime.handleMenuAction({ action, contextSelection });

    expect(contextMenuRuntime.handleMouseDownCapture).toHaveBeenCalledWith({
      button: 2,
      clientX: 10,
      clientY: 20,
      ctrlKey: true,
    });
    expect(contextMenuRuntime.handleMouseMoveCapture).toHaveBeenCalledWith({
      clientX: 30,
      clientY: 40,
    });
    expect(contextMenuRuntime.handleMouseUpCapture).toHaveBeenCalledWith({ button: 2 });
    expect(options.interactionHandlers.openNodeContextMenu).toHaveBeenCalledWith('src/app.ts', graphEvent);
    expect(options.interactionHandlers.openEdgeContextMenu).toHaveBeenCalledWith(link, graphEvent);
    expect(options.interactionHandlers.openBackgroundContextMenu).toHaveBeenCalledWith(graphEvent);
    expect(options.interactionHandlers.getBackgroundGraphPosition).toHaveBeenCalledWith(graphEvent);
    expect(contextMenuRuntime.handleContextMenu).toHaveBeenCalledWith({ x: 24, y: -32 });
    expect(options.getActionContext).toHaveBeenCalledWith(contextSelection);
    expect(contextMenuRuntime.handleMenuAction).toHaveBeenCalledWith(action, expect.objectContaining({
      primaryTargetId: 'src/app.ts',
    }));
  });
});
