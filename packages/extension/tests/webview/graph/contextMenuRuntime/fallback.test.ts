import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  GraphContextMenuRuntimeDependencies,
  GraphRef,
  GraphRightMouseDownState,
  GraphTimerHandle,
} from '../../../../src/webview/components/graph/contextMenuRuntime';
import { createContextMenuFallbackRuntime } from '../../../../src/webview/components/graph/contextMenuRuntime/fallback';

function createRef<TValue>(current: TValue): GraphRef<TValue> {
  return { current };
}

function createDependencies(
  overrides: Partial<GraphContextMenuRuntimeDependencies> = {},
) {
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
    setTooltipData: vi.fn(),
    stopTooltipTracking: vi.fn(),
    ...overrides,
  };

  return { dependencies };
}

describe('graph/contextMenuRuntime/fallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses the injected timer clearer for pending fallback timers', () => {
    const clearFallbackTimer = vi.fn();
    const { dependencies } = createDependencies({
      clearFallbackTimer,
    });
    dependencies.rightClickFallbackTimerRef.current = setTimeout(() => undefined, 1000);
    const runtime = createContextMenuFallbackRuntime(dependencies);

    runtime.clearRightClickFallbackTimer();

    expect(clearFallbackTimer).toHaveBeenCalledOnce();
    expect(dependencies.rightClickFallbackTimerRef.current).toBeNull();
  });

  it('opens the background context menu when graph callbacks do not handle the right click', () => {
    let currentTime = 1000;
    const { dependencies } = createDependencies({
      now: () => currentTime,
    });
    const runtime = createContextMenuFallbackRuntime(dependencies);

    runtime.scheduleRightClickFallback({
      x: 48,
      y: 64,
      ctrlKey: true,
      moved: false,
    });
    currentTime = 1040;
    vi.advanceTimersByTime(40);

    expect(dependencies.openBackgroundContextMenu).toHaveBeenCalledOnce();
  });

  it('does not open the background context menu when a recent graph context event handled it', () => {
    let currentTime = 1000;
    const { dependencies } = createDependencies({
      now: () => currentTime,
    });
    dependencies.lastGraphContextEventRef.current = 990;
    const runtime = createContextMenuFallbackRuntime(dependencies);

    runtime.scheduleRightClickFallback({
      x: 48,
      y: 64,
      ctrlKey: false,
      moved: false,
    });
    currentTime = 1040;
    vi.advanceTimersByTime(40);

    expect(dependencies.openBackgroundContextMenu).not.toHaveBeenCalled();
  });
});
