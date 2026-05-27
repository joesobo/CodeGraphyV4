import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveGraphContextActionContext } from '../../../../src/webview/components/graph/contextActions/context';
import {
  createGraphContextMenuRuntime,
  type GraphContextMenuRuntimeDependencies,
  type GraphRef,
  type GraphRightMouseDownState,
  type GraphTimerHandle,
} from '../../../../src/webview/components/graph/contextMenuRuntime/controller';
import type { GraphTooltipState } from '../../../../src/webview/components/graph/tooltip/model';

function nodeContext(targets: string[]) {
  return resolveGraphContextActionContext({ kind: 'node', targets });
}

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



    it('skips fallback scheduling when the pointer already moved', () => {
      const { dependencies } = createDependencies();
      dependencies.rightMouseDownRef.current = {
        x: 48,
        y: 64,
        ctrlKey: false,
        moved: true,
      };
      const runtime = createGraphContextMenuRuntime(dependencies);

      runtime.handleMouseUpCapture({ button: 2 });
      vi.runAllTimers();

      expect(dependencies.rightMouseDownRef.current).toBeNull();
      expect(dependencies.openBackgroundContextMenu).not.toHaveBeenCalled();
    });



    it('ignores non-right mouse buttons on mouse up', () => {
      const { dependencies } = createDependencies();
      dependencies.rightMouseDownRef.current = {
        x: 48,
        y: 64,
        ctrlKey: false,
        moved: false,
      };
      const runtime = createGraphContextMenuRuntime(dependencies);

      runtime.handleMouseUpCapture({ button: 0 });

      expect(dependencies.rightMouseDownRef.current).toEqual({
        x: 48,
        y: 64,
        ctrlKey: false,
        moved: false,
      });
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



    it('clears tooltip state directly without changing the current context selection', () => {
      const { dependencies, getTooltipState } = createDependencies();
      dependencies.lastContainerContextMenuEventRef.current = 250;
      dependencies.tooltipTimeoutRef.current = setTimeout(() => undefined, 1000);
      const runtime = createGraphContextMenuRuntime(dependencies);

      runtime.clearTooltipContext();

      expect(dependencies.lastContainerContextMenuEventRef.current).toBe(250);
      expect(dependencies.setContextSelection).not.toHaveBeenCalled();
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



    it('keeps the existing selection at the grace-period boundary', () => {
      const currentTime = 500;
      const { dependencies } = createDependencies({
        now: () => currentTime,
      });
      dependencies.lastGraphContextEventRef.current = 350;
      const runtime = createGraphContextMenuRuntime(dependencies);

      runtime.handleContextMenu();

      expect(dependencies.setContextSelection).not.toHaveBeenCalled();
    });



    it('applies built-in menu actions through context effects', () => {
      const { dependencies } = createDependencies();
      const runtime = createGraphContextMenuRuntime(dependencies);

      runtime.handleMenuAction(
        { kind: 'builtin', action: 'open' },
        nodeContext(['src/app.ts']),
      );

      expect(dependencies.clearCachedFile).toHaveBeenCalledWith('src/app.ts');
      expect(dependencies.postMessage).toHaveBeenCalledWith({
        type: 'OPEN_FILE',
        payload: { path: 'src/app.ts' },
      });
    });
});
