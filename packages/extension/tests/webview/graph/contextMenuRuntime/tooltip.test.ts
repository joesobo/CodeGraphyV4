import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphContextMenuRuntimeDependencies, GraphRef, GraphTimerHandle } from '../../../src/webview/components/graph/contextMenuRuntime';
import type { GraphTooltipState } from '../../../src/webview/components/graphTooltipModel';
import { createContextMenuTooltipRuntime } from '../../../src/webview/components/graph/contextMenuRuntimeTooltip';

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
    rightMouseDownRef: createRef(null),
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

describe('graph/contextMenuRuntimeTooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('falls back to a background selection and clears tooltip state on context menu', () => {
    const currentTime = 500;
    const { dependencies, getTooltipState } = createDependencies({
      now: () => currentTime,
    });
    dependencies.lastGraphContextEventRef.current = 100;
    dependencies.tooltipTimeoutRef.current = setTimeout(() => undefined, 1000);
    const runtime = createContextMenuTooltipRuntime(dependencies);

    runtime.handleContextMenu();

    expect(dependencies.lastContainerContextMenuEventRef.current).toBe(500);
    expect(dependencies.setContextSelection).toHaveBeenCalledWith({
      kind: 'background',
      targets: [],
    });
    expect(dependencies.hoveredNodeRef.current).toBeNull();
    expect(getTooltipState()).toMatchObject({
      visible: false,
      pluginSections: [],
    });
  });

  it('keeps the existing selection at the grace-period boundary', () => {
    const currentTime = 500;
    const { dependencies } = createDependencies({
      now: () => currentTime,
    });
    dependencies.lastGraphContextEventRef.current = 350;
    const runtime = createContextMenuTooltipRuntime(dependencies);

    runtime.handleContextMenu();

    expect(dependencies.setContextSelection).not.toHaveBeenCalled();
  });
});
