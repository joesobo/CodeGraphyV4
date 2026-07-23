import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createGraphContextMenuRuntime,
  type GraphContextMenuRuntimeDependencies,
  type GraphRef,
  type GraphRightMouseDownState,
  type GraphTimerHandle,
} from '../../../../src/webview/components/graph/contextMenuRuntime/controller';
import type { GraphTooltipState } from '../../../../src/webview/components/graph/tooltip/model';

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



    it('applies context effects directly through the effect runtime', () => {
      const { dependencies } = createDependencies();
      const runtime = createGraphContextMenuRuntime(dependencies);

      runtime.applyContextEffects([
        { kind: 'fitView' },
        { kind: 'focusNode', nodeId: 'src/app.ts' },
        { kind: 'postMessage', message: { type: 'REFRESH_GRAPH' } },
      ]);

      expect(dependencies.fitView).toHaveBeenCalledOnce();
      expect(dependencies.focusNode).toHaveBeenCalledWith('src/app.ts');
      expect(dependencies.postMessage).toHaveBeenCalledWith({ type: 'REFRESH_GRAPH' });
    });
});
