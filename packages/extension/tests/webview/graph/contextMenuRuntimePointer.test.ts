import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  GraphContextMenuRuntimeDependencies,
  GraphRef,
  GraphRightMouseDownState,
  GraphTimerHandle,
} from '../../../src/webview/components/graph/contextMenuRuntime';
import { createContextMenuPointerRuntime } from '../../../src/webview/components/graph/contextMenuRuntimePointer';

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

describe('graph/contextMenuRuntimePointer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('tracks right-click pointer state and marks movement after the drag threshold', () => {
    const { dependencies } = createDependencies();
    const runtime = createContextMenuPointerRuntime(dependencies);

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

  it('skips fallback scheduling when the pointer already moved', () => {
    const { dependencies } = createDependencies();
    dependencies.rightMouseDownRef.current = {
      x: 48,
      y: 64,
      ctrlKey: false,
      moved: true,
    };
    const runtime = createContextMenuPointerRuntime(dependencies);

    runtime.handleMouseUpCapture({ button: 2 });
    vi.runAllTimers();

    expect(dependencies.rightMouseDownRef.current).toBeNull();
    expect(dependencies.openBackgroundContextMenu).not.toHaveBeenCalled();
  });
});
