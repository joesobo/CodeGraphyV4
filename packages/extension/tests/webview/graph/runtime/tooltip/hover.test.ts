import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FGNode } from '../../../../../src/webview/components/graph/model/build';
import type { IFileInfo } from '../../../../../src/shared/files/info';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import { handleTooltipNodeHover } from '../../../../../src/webview/components/graph/runtime/tooltip/hover';

describe('handleTooltipNodeHover', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('clears an existing hover timeout before handling the next hover event', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const existingTimeout = setTimeout(() => undefined, 1_000);

    handleTooltipNodeHover(null, {
      dataRef: { current: { edges: [], nodes: [] } as IGraphData },
      fileInfoCacheRef: { current: new Map() },
      getNodeRect: vi.fn(),
      hoveredNodeRef: { current: null },
      interactionHandlers: {
        sendGraphInteraction: vi.fn(),
        setGraphCursor: vi.fn(),
      },
      pluginHost: undefined,
      postMessage: vi.fn(),
      setTooltipData: vi.fn(),
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
      tooltipTimeoutRef: { current: existingTimeout },
    });

    expect(clearTimeoutSpy).toHaveBeenCalledWith(existingTimeout);
  });

  it('does not clear a timeout when no hover timeout is active', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    handleTooltipNodeHover(null, {
      dataRef: { current: { edges: [], nodes: [] } as IGraphData },
      fileInfoCacheRef: { current: new Map() },
      getNodeRect: vi.fn(),
      hoveredNodeRef: { current: null },
      interactionHandlers: {
        sendGraphInteraction: vi.fn(),
        setGraphCursor: vi.fn(),
      },
      pluginHost: undefined,
      postMessage: vi.fn(),
      setTooltipData: vi.fn(),
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
      tooltipTimeoutRef: { current: null },
    });

    expect(clearTimeoutSpy).not.toHaveBeenCalled();
  });

  it('hides the tooltip and clears hover state when no node is hovered', () => {
    const hoveredNodeRef = { current: { id: 'stale' } as unknown as FGNode };
    const interactionHandlers = {
      sendGraphInteraction: vi.fn(),
      setGraphCursor: vi.fn(),
    };
    const setTooltipData = vi.fn();
    const stopTracking = vi.fn();

    handleTooltipNodeHover(null, {
      dataRef: { current: { edges: [], nodes: [] } as IGraphData },
      fileInfoCacheRef: { current: new Map() },
      getNodeRect: vi.fn(),
      hoveredNodeRef,
      interactionHandlers,
      pluginHost: undefined,
      postMessage: vi.fn(),
      setTooltipData,
      startTracking: vi.fn(),
      stopTracking,
      tooltipTimeoutRef: { current: null },
    });

    expect(interactionHandlers.setGraphCursor).toHaveBeenCalledWith('default');
    expect(hoveredNodeRef.current).toBeNull();
    expect(stopTracking).toHaveBeenCalledOnce();
    expect(setTooltipData).toHaveBeenCalledOnce();
    expect(interactionHandlers.sendGraphInteraction).toHaveBeenCalledWith('graph:nodeHover', { node: null });
  });

  it('shows the tooltip after the hover delay and requests missing file info', () => {
    const interactionHandlers = {
      sendGraphInteraction: vi.fn(),
      setGraphCursor: vi.fn(),
    };
    const postMessage = vi.fn();
    const setTooltipData = vi.fn();
    const startTracking = vi.fn();
    const hoveredNodeRef = { current: null as FGNode | null };
    const node = { color: '#123456', id: 'src/App.ts', label: 'App' } as FGNode;

    handleTooltipNodeHover(node, {
      dataRef: {
        current: {
          edges: [],
          nodes: [{ color: '#123456', id: 'src/App.ts', label: 'App' }],
        } as IGraphData,
      },
      fileInfoCacheRef: { current: new Map() },
      getNodeRect: () => ({ x: 5, y: 6, radius: 7 }),
      hoveredNodeRef,
      interactionHandlers,
      pluginHost: {
        getTooltipContent: () => ({
          sections: [{ content: 'details', title: 'Plugin' }],
        }),
      } as unknown as NonNullable<Parameters<typeof handleTooltipNodeHover>[1]['pluginHost']>,
      postMessage,
      setTooltipData,
      startTracking,
      stopTracking: vi.fn(),
      tooltipTimeoutRef: { current: null },
    });

    expect(interactionHandlers.setGraphCursor).toHaveBeenCalledWith('pointer');
    expect(interactionHandlers.sendGraphInteraction).toHaveBeenCalledWith('graph:nodeHover', {
      node: { id: 'src/App.ts', label: 'App' },
    });

    vi.advanceTimersByTime(500);

    expect(setTooltipData).toHaveBeenCalledOnce();
    expect(postMessage).toHaveBeenCalledWith({
      payload: { path: 'src/App.ts' },
      type: 'GET_FILE_INFO',
    });
    expect(startTracking).toHaveBeenCalledOnce();
    expect(hoveredNodeRef.current).toBe(node);
  });

  it('uses cached file info without posting a fetch request', () => {
    const cachedInfo = { path: 'src/App.ts' } as IFileInfo;
    const postMessage = vi.fn();
    const setTooltipData = vi.fn();
    const startTracking = vi.fn();
    const node = { color: '#123456', id: 'src/App.ts', label: 'App' } as FGNode;

    handleTooltipNodeHover(node, {
      dataRef: {
        current: {
          edges: [],
          nodes: [{ color: '#123456', id: 'src/App.ts', label: 'App' }],
        } as IGraphData,
      },
      fileInfoCacheRef: { current: new Map([[node.id, cachedInfo]]) },
      getNodeRect: () => ({ x: 1, y: 2, radius: 3 }),
      hoveredNodeRef: { current: null },
      interactionHandlers: {
        sendGraphInteraction: vi.fn(),
        setGraphCursor: vi.fn(),
      },
      pluginHost: undefined,
      postMessage,
      setTooltipData,
      startTracking,
      stopTracking: vi.fn(),
      tooltipTimeoutRef: { current: null },
    });

    vi.advanceTimersByTime(500);

    expect(setTooltipData).toHaveBeenCalledWith({
      info: cachedInfo,
      nodeRect: { x: 1, y: 2, radius: 3 },
      path: 'src/App.ts',
      pluginActions: [],
      pluginSections: [],
      visible: true,
    });
    expect(postMessage).not.toHaveBeenCalled();
    expect(startTracking).toHaveBeenCalledOnce();
  });

  it('does not request file info for synthetic package nodes', () => {
    const postMessage = vi.fn();
    const node = {
      baseOpacity: 1,
      borderColor: '#F59E0B',
      borderWidth: 2,
      color: '#F59E0B',
      id: 'pkg:fs',
      isFavorite: false,
      label: 'fs',
      size: 16,
      nodeType: 'package',
    } as FGNode & { nodeType: 'package' };

    handleTooltipNodeHover(node, {
      dataRef: {
        current: {
          edges: [],
          nodes: [node],
        } as IGraphData,
      },
      fileInfoCacheRef: { current: new Map() },
      getNodeRect: () => ({ x: 1, y: 2, radius: 3 }),
      hoveredNodeRef: { current: null },
      interactionHandlers: {
        sendGraphInteraction: vi.fn(),
        setGraphCursor: vi.fn(),
      },
      pluginHost: undefined,
      postMessage,
      setTooltipData: vi.fn(),
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
      tooltipTimeoutRef: { current: null },
    });

    vi.advanceTimersByTime(500);

    expect(postMessage).not.toHaveBeenCalled();
  });

  it('does not request file info for package-like node ids even when the node type is not package', () => {
    const postMessage = vi.fn();
    const setTooltipData = vi.fn();
    const node = {
      color: '#123456',
      id: 'pkg:fs',
      label: 'fs',
    } as FGNode;

    handleTooltipNodeHover(node, {
      dataRef: {
        current: {
          edges: [],
          nodes: [node],
        } as IGraphData,
      },
      fileInfoCacheRef: { current: new Map() },
      getNodeRect: () => ({ x: 1, y: 2, radius: 3 }),
      hoveredNodeRef: { current: null },
      interactionHandlers: {
        sendGraphInteraction: vi.fn(),
        setGraphCursor: vi.fn(),
      },
      pluginHost: undefined,
      postMessage,
      setTooltipData,
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
      tooltipTimeoutRef: { current: null },
    });

    vi.advanceTimersByTime(500);

    expect(setTooltipData).toHaveBeenCalledOnce();
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('clears the previous hover timeout when a second node is hovered before the first delay elapses', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const setTooltipData = vi.fn();
    const startTracking = vi.fn();
    const firstNode = { color: '#123456', id: 'src/first.ts', label: 'First' } as FGNode;
    const secondNode = { color: '#654321', id: 'src/second.ts', label: 'Second' } as FGNode;
    const tooltipTimeoutRef = { current: null as ReturnType<typeof setTimeout> | null };

    handleTooltipNodeHover(firstNode, {
      dataRef: { current: { edges: [], nodes: [firstNode] } as IGraphData },
      fileInfoCacheRef: { current: new Map() },
      getNodeRect: () => ({ x: 1, y: 2, radius: 3 }),
      hoveredNodeRef: { current: null },
      interactionHandlers: {
        sendGraphInteraction: vi.fn(),
        setGraphCursor: vi.fn(),
      },
      pluginHost: undefined,
      postMessage: vi.fn(),
      setTooltipData,
      startTracking,
      stopTracking: vi.fn(),
      tooltipTimeoutRef,
    });

    handleTooltipNodeHover(secondNode, {
      dataRef: { current: { edges: [], nodes: [secondNode] } as IGraphData },
      fileInfoCacheRef: { current: new Map() },
      getNodeRect: () => ({ x: 4, y: 5, radius: 6 }),
      hoveredNodeRef: { current: null },
      interactionHandlers: {
        sendGraphInteraction: vi.fn(),
        setGraphCursor: vi.fn(),
      },
      pluginHost: undefined,
      postMessage: vi.fn(),
      setTooltipData,
      startTracking,
      stopTracking: vi.fn(),
      tooltipTimeoutRef,
    });

    expect(clearTimeoutSpy).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(500);

    expect(setTooltipData).toHaveBeenCalledOnce();
    expect(startTracking).toHaveBeenCalledOnce();
    expect(tooltipTimeoutRef.current).not.toBeNull();
  });
});
