import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGraphInteractionRuntime } from '../../../../../src/webview/components/graph/runtime/use/interaction';
import type { GraphContextMenuAction, GraphContextSelection } from '../../../../../src/webview/components/graph/contextMenu/contracts';
import {
  createContextMenuRuntime,
  createInteractionHandlers,
  createMarqueeRuntime,
  createNode,
  createRuntimeOptions,
  createSelection,
  createTooltipRuntime,
  createViewportPanRuntime,
} from './interactionFixture';

const interactionRuntimeHarness = vi.hoisted(() => ({
  applyCursorToGraphSurface: vi.fn(),
  createGraphContextMenuRuntime: vi.fn(),
  createGraphInteractionHandlers: vi.fn(),
  postMessage: vi.fn(),
  useGraphMarqueeSelectionRuntime: vi.fn(),
  useGraphTooltip: vi.fn(),
  useGraphViewportPanRuntime: vi.fn(),
}));

vi.mock('../../../../../src/webview/components/graph/contextMenuRuntime/controller', () => ({
  createGraphContextMenuRuntime: interactionRuntimeHarness.createGraphContextMenuRuntime,
}));
vi.mock('../../../../../src/webview/components/graph/interactionRuntime/handlers', () => ({
  createGraphInteractionHandlers: interactionRuntimeHarness.createGraphInteractionHandlers,
}));
vi.mock('../../../../../src/webview/components/graph/support/dom', () => ({
  applyCursorToGraphSurface: interactionRuntimeHarness.applyCursorToGraphSurface,
}));
vi.mock('../../../../../src/webview/components/graph/runtime/use/tooltip/hook', () => ({
  useGraphTooltip: interactionRuntimeHarness.useGraphTooltip,
}));
vi.mock('../../../../../src/webview/components/graph/runtime/use/interaction/marquee/hook', () => ({
  useGraphMarqueeSelectionRuntime: interactionRuntimeHarness.useGraphMarqueeSelectionRuntime,
}));
vi.mock('../../../../../src/webview/components/graph/runtime/use/interaction/viewportPan/hook', () => ({
  useGraphViewportPanRuntime: interactionRuntimeHarness.useGraphViewportPanRuntime,
}));
vi.mock('../../../../../src/webview/vscodeApi', () => ({
  postMessage: interactionRuntimeHarness.postMessage,
}));

describe('graph/runtime/useGraphInteractionRuntime context actions', () => {
  beforeEach(() => {
    interactionRuntimeHarness.applyCursorToGraphSurface.mockReset();
    interactionRuntimeHarness.createGraphContextMenuRuntime.mockReset();
    interactionRuntimeHarness.createGraphInteractionHandlers.mockReset();
    interactionRuntimeHarness.postMessage.mockReset();
    interactionRuntimeHarness.useGraphMarqueeSelectionRuntime.mockReset();
    interactionRuntimeHarness.useGraphTooltip.mockReset();
    interactionRuntimeHarness.useGraphViewportPanRuntime.mockReset();
    interactionRuntimeHarness.useGraphMarqueeSelectionRuntime.mockReturnValue(createMarqueeRuntime());
    interactionRuntimeHarness.useGraphViewportPanRuntime.mockReturnValue(createViewportPanRuntime());
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  it('applies functional context selection updates to the live selection and latest setter', () => {
    const interactionHandlers = createInteractionHandlers();
    const contextMenuRuntime = createContextMenuRuntime();
    const tooltipRuntime = createTooltipRuntime();
    const firstSetContextSelection = vi.fn();
    const secondSetContextSelection = vi.fn();

    interactionRuntimeHarness.createGraphInteractionHandlers.mockReturnValue(interactionHandlers);
    interactionRuntimeHarness.createGraphContextMenuRuntime.mockReturnValue(contextMenuRuntime);
    interactionRuntimeHarness.useGraphTooltip.mockReturnValue(tooltipRuntime);

    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));

    const { rerender } = renderHook(
      ({ graphContextSelection, setContextSelection }) => useGraphInteractionRuntime(createRuntimeOptions({
        graphContextSelection,
        setContextSelection,
      })),
      {
        initialProps: {
          graphContextSelection: createSelection(['src/one.ts']),
          setContextSelection: firstSetContextSelection,
        },
      },
    );

    rerender({
      graphContextSelection: createSelection(['src/two.ts']),
      setContextSelection: secondSetContextSelection,
    });

    const contextMenuOptions = interactionRuntimeHarness.createGraphContextMenuRuntime.mock.calls.at(-1)?.[0];
    contextMenuOptions.setContextSelection((previous: GraphContextSelection) => ({
      ...previous,
      targets: [`${previous.targets[0]}:child`],
    }));

    expect(firstSetContextSelection).not.toHaveBeenCalled();
    expect(secondSetContextSelection).toHaveBeenCalledWith({
      kind: 'node',
      targets: ['src/two.ts:child'],
    });
  });

  it('builds menu action context from the latest scale and graph nodes', () => {
    const interactionHandlers = createInteractionHandlers();
    const contextMenuRuntime = createContextMenuRuntime();
    const tooltipRuntime = createTooltipRuntime();
    const graph = { zoom: vi.fn(() => 2) };

    interactionRuntimeHarness.createGraphInteractionHandlers.mockReturnValue(interactionHandlers);
    interactionRuntimeHarness.createGraphContextMenuRuntime.mockReturnValue(contextMenuRuntime);
    interactionRuntimeHarness.useGraphTooltip.mockReturnValue(tooltipRuntime);

    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));

    const { result, rerender } = renderHook(
      ({ graphContextSelection, graphDataRef }) => useGraphInteractionRuntime(createRuntimeOptions({
        graphContextSelection,
        graphDataRef,
        refs: {
          fg2dRef: { current: graph as never },
        },
      })),
      {
        initialProps: {
          graphContextSelection: createSelection(['src/one.ts']),
          graphDataRef: { current: { links: [], nodes: [createNode('src/one.ts')] } } as never,
        },
      },
    );

    rerender({
      graphContextSelection: createSelection(['src/two.ts']),
      graphDataRef: { current: { links: [], nodes: [createNode('src/two.ts')] } } as never,
    });

    const action: GraphContextMenuAction = {
      action: 'focus',
      kind: 'builtin',
    };
    result.current.handleMenuAction({
      action,
      contextSelection: createSelection(['src/one.ts']),
    });

    expect(contextMenuRuntime.handleMenuAction).toHaveBeenCalledWith(action, expect.objectContaining({
      graphViewportScale: 2,
      mutationDirectory: 'src/one.ts',
      primaryNode: undefined,
      primaryTargetId: 'src/one.ts',
    }));
  });

});
