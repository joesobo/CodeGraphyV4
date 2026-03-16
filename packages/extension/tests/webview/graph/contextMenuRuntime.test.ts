import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphTooltipState } from '../../../src/webview/components/graphTooltipModel';
import {
  createGraphContextMenuRuntime,
  type GraphContextMenuRuntimeDependencies,
  type GraphRef,
  type GraphRightMouseDownState,
  type GraphTimerHandle,
} from '../../../src/webview/components/graph/contextMenuRuntime';

function createRef<TValue>(current: TValue): GraphRef<TValue> {
  return { current };
}

function createTooltipState(): GraphTooltipState {
  return {
    visible: true,
    nodeRect: { x: 10, y: 20, radius: 30 },
    path: 'src/app.ts',
    info: null,
    pluginSections: [{ title: 'Plugin', content: 'Details' }],
  };
}

function createDependencies(
  overrides: Partial<GraphContextMenuRuntimeDependencies> = {},
) {
  let tooltipState = createTooltipState();
  const dependencies: GraphContextMenuRuntimeDependencies = {
    hoveredNodeRef: createRef({ id: 'src/app.ts' }),
    lastContainerContextMenuEventRef: createRef(0),
    lastGraphContextEventRef: createRef(0),
    rightClickFallbackTimerRef: createRef<GraphTimerHandle | null>(null),
    rightMouseDownRef: createRef<GraphRightMouseDownState | null>(null),
    tooltipTimeoutRef: createRef<GraphTimerHandle | null>(null),
    clearCachedFile: vi.fn(),
    fitView: vi.fn(),
    focusNode: vi.fn(),
    openBackgroundContextMenu: vi.fn(),
    postMessage: vi.fn(),
    setContextSelection: vi.fn(),
    setTooltipData: vi.fn((updater) => {
      tooltipState = updater(tooltipState);
    }),
    stopTooltipTracking: vi.fn(),
    ...overrides,
  };

  return {
    dependencies,
    getTooltipState: () => tooltipState,
  };
}

describe('graph/contextMenuRuntime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('tracks right-click pointer state on mouse down', () => {
    const { dependencies } = createDependencies();
    dependencies.rightClickFallbackTimerRef.current = setTimeout(() => undefined, 1000);
    const runtime = createGraphContextMenuRuntime(dependencies);

    runtime.handleMouseDownCapture({
      button: 2,
      clientX: 24,
      clientY: 32,
      ctrlKey: true,
    });

    expect(dependencies.rightClickFallbackTimerRef.current).toBeNull();
    expect(dependencies.rightMouseDownRef.current).toEqual({
      x: 24,
      y: 32,
      ctrlKey: true,
      moved: false,
    });
  });

  it('marks right-click pointer state as moved after drag threshold', () => {
    const { dependencies } = createDependencies();
    const runtime = createGraphContextMenuRuntime(dependencies);

    runtime.handleMouseDownCapture({
      button: 2,
      clientX: 10,
      clientY: 10,
      ctrlKey: false,
    });
    runtime.handleMouseMoveCapture({
      clientX: 20,
      clientY: 20,
    });

    expect(dependencies.rightMouseDownRef.current?.moved).toBe(true);
  });

  it('opens the background context menu when graph callbacks do not handle the right click', () => {
    let currentTime = 1000;
    const { dependencies } = createDependencies({
      now: () => currentTime,
    });
    const runtime = createGraphContextMenuRuntime(dependencies);

    runtime.handleMouseDownCapture({
      button: 2,
      clientX: 48,
      clientY: 64,
      ctrlKey: true,
    });
    runtime.handleMouseUpCapture({ button: 2 });
    currentTime = 1040;
    vi.advanceTimersByTime(40);

    expect(dependencies.openBackgroundContextMenu).toHaveBeenCalledOnce();
    expect(dependencies.openBackgroundContextMenu).toHaveBeenCalledWith(
      expect.objectContaining({
        clientX: 48,
        clientY: 64,
        ctrlKey: true,
      }),
    );
  });

  it('skips the background fallback when a graph callback already handled the right click', () => {
    let currentTime = 1000;
    const { dependencies } = createDependencies({
      now: () => currentTime,
    });
    dependencies.lastGraphContextEventRef.current = 960;
    const runtime = createGraphContextMenuRuntime(dependencies);

    runtime.handleMouseDownCapture({
      button: 2,
      clientX: 48,
      clientY: 64,
      ctrlKey: false,
    });
    runtime.handleMouseUpCapture({ button: 2 });
    currentTime = 1040;
    vi.advanceTimersByTime(40);

    expect(dependencies.openBackgroundContextMenu).not.toHaveBeenCalled();
  });

  it('falls back to a background selection and clears tooltip state on context menu', () => {
    const currentTime = 500;
    const { dependencies, getTooltipState } = createDependencies({
      now: () => currentTime,
    });
    dependencies.lastGraphContextEventRef.current = 100;
    dependencies.tooltipTimeoutRef.current = setTimeout(() => undefined, 1000);
    const runtime = createGraphContextMenuRuntime(dependencies);

    runtime.handleContextMenu();

    expect(dependencies.lastContainerContextMenuEventRef.current).toBe(500);
    expect(dependencies.setContextSelection).toHaveBeenCalledWith({
      kind: 'background',
      targets: [],
    });
    expect(dependencies.tooltipTimeoutRef.current).toBeNull();
    expect(dependencies.hoveredNodeRef.current).toBeNull();
    expect(dependencies.stopTooltipTracking).toHaveBeenCalledOnce();
    expect(getTooltipState()).toMatchObject({
      visible: false,
      pluginSections: [],
    });
  });

  it('keeps the existing selection when the graph callback handled the context menu recently', () => {
    const currentTime = 500;
    const { dependencies } = createDependencies({
      now: () => currentTime,
    });
    dependencies.lastGraphContextEventRef.current = 400;
    const runtime = createGraphContextMenuRuntime(dependencies);

    runtime.handleContextMenu();

    expect(dependencies.setContextSelection).not.toHaveBeenCalled();
  });

  it('applies built-in menu actions through context effects', () => {
    const { dependencies } = createDependencies();
    const runtime = createGraphContextMenuRuntime(dependencies);

    runtime.handleMenuAction(
      { kind: 'builtin', action: 'open' },
      ['src/app.ts'],
    );

    expect(dependencies.clearCachedFile).toHaveBeenCalledWith('src/app.ts');
    expect(dependencies.postMessage).toHaveBeenCalledWith({
      type: 'OPEN_FILE',
      payload: { path: 'src/app.ts' },
    });
  });

  it('posts plugin menu actions through context effects', () => {
    const { dependencies } = createDependencies();
    const runtime = createGraphContextMenuRuntime(dependencies);

    runtime.handleMenuAction(
      {
        kind: 'plugin',
        pluginId: 'plugin.test',
        index: 2,
        targetId: 'src/app.ts',
        targetType: 'node',
      },
      ['src/app.ts'],
    );

    expect(dependencies.postMessage).toHaveBeenCalledWith({
      type: 'PLUGIN_CONTEXT_MENU_ACTION',
      payload: {
        pluginId: 'plugin.test',
        index: 2,
        targetId: 'src/app.ts',
        targetType: 'node',
      },
    });
  });
});
