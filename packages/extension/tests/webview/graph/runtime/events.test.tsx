import { renderHook } from '@testing-library/react';
import type { Dispatch, SetStateAction } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IFileInfo } from '../../../../src/shared/files/info';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import type { FGLink, FGNode } from '../../../../src/webview/components/graph/model/build';
import type { GraphInteractionHandlers } from '../../../../src/webview/components/graph/interactionRuntime/handlers';
import type { GraphTooltipState } from '../../../../src/webview/components/graph/tooltipModel';
import { useGraphEventEffects } from '../../../../src/webview/components/graph/runtime/use/events';

const eventEffectsHarness = vi.hoisted(() => ({
  applyKeyboardEffects: vi.fn(),
  createGraphKeyboardListener: vi.fn(),
  createGraphMessageListener: vi.fn(),
  exportAsJpeg: vi.fn(),
  exportAsJson: vi.fn(),
  exportAsMarkdown: vi.fn(),
  exportAsPng: vi.fn(),
  exportAsSvg: vi.fn(),
  handleExtensionMessage: vi.fn(),
  postMessage: vi.fn(),
  runWebviewMessageEffects: vi.fn(),
}));

vi.mock('../../../../src/webview/components/graph/effects/keyboard', () => ({
  applyKeyboardEffects: eventEffectsHarness.applyKeyboardEffects,
}));

vi.mock('../../../../src/webview/components/graph/effects/messages', () => ({
  applyWebviewMessageEffects: eventEffectsHarness.runWebviewMessageEffects,
}));

vi.mock('../../../../src/webview/components/graph/keyboard/listener', () => ({
  createGraphKeyboardListener: eventEffectsHarness.createGraphKeyboardListener,
}));

vi.mock('../../../../src/webview/components/graph/messageListener', () => ({
  createGraphMessageListener: eventEffectsHarness.createGraphMessageListener,
}));

vi.mock('../../../../src/webview/export/jpeg', () => ({
  exportAsJpeg: eventEffectsHarness.exportAsJpeg,
}));

vi.mock('../../../../src/webview/export/json/export', () => ({
  exportAsJson: eventEffectsHarness.exportAsJson,
}));

vi.mock('../../../../src/webview/export/markdown/export', () => ({
  exportAsMarkdown: eventEffectsHarness.exportAsMarkdown,
}));

vi.mock('../../../../src/webview/export/png', () => ({
  exportAsPng: eventEffectsHarness.exportAsPng,
}));

vi.mock('../../../../src/webview/export/svg/export', () => ({
  exportAsSvg: eventEffectsHarness.exportAsSvg,
}));

vi.mock('../../../../src/webview/vscodeApi', () => ({
  postMessage: eventEffectsHarness.postMessage,
}));

vi.mock('../../../../src/webview/store/state', () => ({
  graphStore: {
    getState: () => ({
      handleExtensionMessage: eventEffectsHarness.handleExtensionMessage,
    }),
  },
}));

interface MessageEffectHandlers {
  cacheFileInfo: (info: IFileInfo) => void;
  exportJpeg: () => void;
  exportJson: () => void;
  exportMarkdown: () => void;
  exportPng: () => void;
  exportSvg: () => void;
  fitView: () => void;
  postMessage: typeof eventEffectsHarness.postMessage;
  updateAccessCount: (nodeId: string, accessCount: number) => void;
  updateTooltipInfo: (info: IFileInfo) => void;
  zoom2d: (factor: number) => void;
}

interface GraphEventHookProps {
  graphMode: '2d' | '3d';
  interactionHandlers: GraphInteractionHandlers;
  selectedNodes: string[];
  tooltipPath: string;
}

function createInteractionHandlers(): GraphInteractionHandlers {
  return {
    applyGraphInteractionEffects: vi.fn(),
    clearSelection: vi.fn(),
    fitView: vi.fn(),
    focusNodeById: vi.fn(),
    handleBackgroundClick: vi.fn(),
    handleLinkClick: vi.fn(),
    handleNodeClick: vi.fn(),
    openBackgroundContextMenu: vi.fn(),
    openEdgeContextMenu: vi.fn(),
    openNodeContextMenu: vi.fn(),
    previewNode: vi.fn(),
    requestNodeOpenById: vi.fn(),
    selectOnlyNode: vi.fn(),
    sendGraphInteraction: vi.fn(),
    setGraphCursor: vi.fn(),
    setHighlight: vi.fn(),
    setSelection: vi.fn(),
    updateAccessCount: vi.fn(),
    zoom2d: vi.fn(),
  };
}

function createTooltipSetter() {
  let tooltipData: GraphTooltipState = {
    visible: false,
    nodeRect: { x: 0, y: 0, radius: 0 },
    path: '',
    info: null,
    pluginSections: [],
  };

  return {
    getTooltipData: () => tooltipData,
    setTooltipData: vi.fn(
      (value: GraphTooltipState | ((previous: GraphTooltipState) => GraphTooltipState)) => {
        tooltipData = typeof value === 'function' ? value(tooltipData) : value;
      },
    ) as Dispatch<SetStateAction<GraphTooltipState>>,
  };
}

function createData(path = 'src/app.ts'): IGraphData {
  return {
    edges: [],
    nodes: [{ id: path, path }],
  } as unknown as IGraphData;
}

function createNode(id: string): FGNode {
  return { id } as FGNode;
}

function createLink(id: string): FGLink {
  return { id } as FGLink;
}

describe('graph/runtime/useGraphEventEffects', () => {
  beforeEach(() => {
    eventEffectsHarness.applyKeyboardEffects.mockReset();
    eventEffectsHarness.createGraphKeyboardListener.mockReset();
    eventEffectsHarness.createGraphMessageListener.mockReset();
    eventEffectsHarness.exportAsJpeg.mockReset();
    eventEffectsHarness.exportAsJson.mockReset();
    eventEffectsHarness.exportAsMarkdown.mockReset();
    eventEffectsHarness.exportAsPng.mockReset();
    eventEffectsHarness.exportAsSvg.mockReset();
    eventEffectsHarness.handleExtensionMessage.mockReset();
    eventEffectsHarness.postMessage.mockReset();
    eventEffectsHarness.runWebviewMessageEffects.mockReset();
  });

  it('wires message effects to live refs and interaction handlers', () => {
    const messageHandler = vi.fn();
    const keyboardHandler = vi.fn();
    eventEffectsHarness.createGraphMessageListener.mockReturnValue(messageHandler);
    eventEffectsHarness.createGraphKeyboardListener.mockReturnValue(keyboardHandler);
    let capturedHandlers: MessageEffectHandlers | undefined;
    eventEffectsHarness.runWebviewMessageEffects.mockImplementation((_, handlers: MessageEffectHandlers) => {
      capturedHandlers = handlers;
    });

    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const containerRef = { current: document.createElement('div') };
    const dataRef = { current: createData('src/initial.ts') };
    const directionColorRef = { current: '#60a5fa' };
    const directionModeRef = { current: 'incoming' as never };
    const fileInfoCacheRef = { current: new Map<string, IFileInfo>() };
    const graphDataRef = {
      current: {
        links: [createLink('edge-a')],
        nodes: [createNode('src/initial.ts')],
      },
    };
    const interactionHandlers = createInteractionHandlers();
    const showLabelsRef = { current: true };
    const themeRef = { current: 'light' as never };
    const tooltip = createTooltipSetter();

    renderHook(() => useGraphEventEffects({
      containerRef,
      dataRef,
      directionColorRef,
      directionModeRef,
      fileInfoCacheRef,
      graphDataRef,
      graphMode: '2d',
      interactionHandlers,
      selectedNodes: ['src/initial.ts'],
      setTooltipData: tooltip.setTooltipData,
      showLabelsRef,
      themeRef,
      tooltipPath: 'src/initial.ts',
    }));

    expect(addEventListenerSpy).toHaveBeenCalledWith('message', messageHandler);
    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', keyboardHandler);

    const messageOptions = eventEffectsHarness.createGraphMessageListener.mock.calls[0]?.[0];
    expect(messageOptions).toBeDefined();

    const effects = [{ kind: 'fitView' }];
    messageOptions.applyEffects(effects);
    expect(capturedHandlers).toBeDefined();

    expect(eventEffectsHarness.runWebviewMessageEffects).toHaveBeenCalledWith(
      effects,
      expect.objectContaining({
        cacheFileInfo: expect.any(Function),
        exportJpeg: expect.any(Function),
        exportJson: expect.any(Function),
        exportMarkdown: expect.any(Function),
        exportPng: expect.any(Function),
        exportSvg: expect.any(Function),
        fitView: expect.any(Function),
        postMessage: eventEffectsHarness.postMessage,
        updateAccessCount: expect.any(Function),
        updateTooltipInfo: expect.any(Function),
        zoom2d: expect.any(Function),
      }),
    );

    const fileInfo = { path: 'src/tooltip.ts' } as IFileInfo;
    capturedHandlers?.fitView();
    capturedHandlers?.zoom2d(1.5);
    capturedHandlers?.cacheFileInfo(fileInfo);
    capturedHandlers?.updateTooltipInfo(fileInfo);
    capturedHandlers?.postMessage({ type: 'PING' });
    capturedHandlers?.exportPng();
    capturedHandlers?.exportSvg();
    capturedHandlers?.exportJpeg();
    capturedHandlers?.exportJson();
    capturedHandlers?.exportMarkdown();
    capturedHandlers?.updateAccessCount('src/initial.ts', 3);

    expect(interactionHandlers.fitView).toHaveBeenCalledTimes(1);
    expect(interactionHandlers.zoom2d).toHaveBeenCalledWith(1.5);
    expect(fileInfoCacheRef.current.get(fileInfo.path)).toBe(fileInfo);
    expect(tooltip.getTooltipData()).toMatchObject({ info: fileInfo });
    expect(eventEffectsHarness.postMessage).toHaveBeenCalledWith({ type: 'PING' });
    expect(eventEffectsHarness.exportAsPng).toHaveBeenCalledWith(containerRef.current);
    expect(eventEffectsHarness.exportAsSvg).toHaveBeenCalledWith(
      graphDataRef.current.nodes,
      graphDataRef.current.links,
      {
        directionColor: '#60a5fa',
        directionMode: 'incoming',
        showLabels: true,
        theme: 'light',
      },
    );
    expect(eventEffectsHarness.exportAsJpeg).toHaveBeenCalledWith(containerRef.current);
    expect(eventEffectsHarness.exportAsJson).toHaveBeenCalledWith(dataRef.current);
    expect(eventEffectsHarness.exportAsMarkdown).toHaveBeenCalledWith(dataRef.current);
    expect(interactionHandlers.updateAccessCount).toHaveBeenCalledWith('src/initial.ts', 3);

    addEventListenerSpy.mockRestore();
  });

  it('re-registers listeners with updated graph and selection inputs', () => {
    const messageHandlerOne = vi.fn();
    const messageHandlerTwo = vi.fn();
    const keyboardHandlerOne = vi.fn();
    const keyboardHandlerTwo = vi.fn();
    eventEffectsHarness.createGraphMessageListener
      .mockReturnValueOnce(messageHandlerOne)
      .mockReturnValueOnce(messageHandlerTwo);
    eventEffectsHarness.createGraphKeyboardListener
      .mockReturnValueOnce(keyboardHandlerOne)
      .mockReturnValueOnce(keyboardHandlerTwo);

    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const graphDataRef = {
      current: {
        links: [createLink('edge-a')],
        nodes: [createNode('src/one.ts')],
      },
    };

    const { rerender, unmount } = renderHook(
      ({ graphMode, interactionHandlers, selectedNodes, tooltipPath }: GraphEventHookProps) => useGraphEventEffects({
        containerRef: { current: document.createElement('div') },
        dataRef: { current: createData('src/one.ts') },
        directionColorRef: { current: '#22c55e' },
        directionModeRef: { current: 'incoming' as never },
        fileInfoCacheRef: { current: new Map<string, IFileInfo>() },
        graphDataRef,
        graphMode,
        interactionHandlers,
        selectedNodes,
        setTooltipData: vi.fn(),
        showLabelsRef: { current: true },
        themeRef: { current: 'light' as never },
        tooltipPath,
      }),
      {
        initialProps: {
          graphMode: '2d' as const,
          interactionHandlers: createInteractionHandlers(),
          selectedNodes: ['src/one.ts'],
          tooltipPath: 'src/one.ts',
        },
      },
    );

    graphDataRef.current = {
      links: [createLink('edge-b')],
      nodes: [createNode('src/two.ts')],
    };
    const updatedInteractionHandlers = createInteractionHandlers();

    rerender({
      graphMode: '3d' as '2d' | '3d',
      interactionHandlers: updatedInteractionHandlers,
      selectedNodes: ['src/two.ts'],
      tooltipPath: 'src/two.ts',
    } as never);

    expect(removeEventListenerSpy).toHaveBeenCalledWith('message', messageHandlerOne);
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', keyboardHandlerOne);
    expect(addEventListenerSpy).toHaveBeenCalledWith('message', messageHandlerTwo);
    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', keyboardHandlerTwo);

    const messageOptions = eventEffectsHarness.createGraphMessageListener.mock.calls[1]?.[0];
    const keyboardOptions = eventEffectsHarness.createGraphKeyboardListener.mock.calls[1]?.[0];

    expect(messageOptions.graphMode).toBe('3d');
    expect(messageOptions.tooltipPath).toBe('src/two.ts');
    expect(messageOptions.getGraphNodes()).toEqual(graphDataRef.current.nodes);
    expect(keyboardOptions.graphMode).toBe('3d');
    expect(keyboardOptions.selectedNodeIds).toEqual(['src/two.ts']);
    expect(keyboardOptions.getAllNodeIds()).toEqual(['src/two.ts']);
    expect(keyboardOptions.runEffects).toBe(eventEffectsHarness.applyKeyboardEffects);

    keyboardOptions.fitView();
    keyboardOptions.setSelection(['src/three.ts']);
    keyboardOptions.openNode('src/four.ts');
    keyboardOptions.zoom2d(1.5);
    keyboardOptions.postMessage({ type: 'PING' });
    keyboardOptions.dispatchStoreMessage({ type: 'SET_GRAPH_MODE', payload: '2d' });

    expect(updatedInteractionHandlers.fitView).toHaveBeenCalledTimes(1);
    expect(updatedInteractionHandlers.setSelection).toHaveBeenCalledWith(['src/three.ts']);
    expect(updatedInteractionHandlers.requestNodeOpenById).toHaveBeenCalledWith('src/four.ts');
    expect(updatedInteractionHandlers.zoom2d).toHaveBeenCalledWith(1.5);
    expect(eventEffectsHarness.postMessage).toHaveBeenCalledWith({ type: 'PING' });
    expect(eventEffectsHarness.handleExtensionMessage).toHaveBeenCalledWith({
      payload: '2d',
      type: 'SET_GRAPH_MODE',
    });

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('message', messageHandlerTwo);
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', keyboardHandlerTwo);

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('refreshes the message listener when only message effect dependencies change', () => {
    const messageHandlerOne = vi.fn();
    const messageHandlerTwo = vi.fn();
    const keyboardHandler = vi.fn();
    eventEffectsHarness.createGraphMessageListener
      .mockReturnValueOnce(messageHandlerOne)
      .mockReturnValueOnce(messageHandlerTwo);
    eventEffectsHarness.createGraphKeyboardListener.mockReturnValue(keyboardHandler);

    let tooltipCounter = 0;
    eventEffectsHarness.runWebviewMessageEffects.mockImplementation((_, handlers: MessageEffectHandlers) => {
      tooltipCounter += 1;
      handlers.updateTooltipInfo({ path: `src/tooltip-${tooltipCounter}.ts` } as IFileInfo);
    });

    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const firstTooltip = createTooltipSetter();
    const secondTooltip = createTooltipSetter();
    const containerRef = { current: document.createElement('div') };
    const dataRef = { current: createData('src/one.ts') };
    const directionColorRef = { current: '#22c55e' };
    const directionModeRef = { current: 'incoming' as never };
    const fileInfoCacheRef = { current: new Map<string, IFileInfo>() };
    const graphDataRef = {
      current: {
        links: [createLink('edge-a')],
        nodes: [createNode('src/one.ts')],
      },
    };
    const interactionHandlers = createInteractionHandlers();
    const selectedNodes = ['src/one.ts'];
    const showLabelsRef = { current: true };
    const themeRef = { current: 'light' as never };

    const { rerender } = renderHook(
      ({ setTooltipData }: { setTooltipData: Dispatch<SetStateAction<GraphTooltipState>> }) => useGraphEventEffects({
        containerRef,
        dataRef,
        directionColorRef,
        directionModeRef,
        fileInfoCacheRef,
        graphDataRef,
        graphMode: '2d',
        interactionHandlers,
        selectedNodes,
        setTooltipData,
        showLabelsRef,
        themeRef,
        tooltipPath: 'src/one.ts',
      }),
      {
        initialProps: {
          setTooltipData: firstTooltip.setTooltipData,
        },
      },
    );

    const firstMessageOptions = eventEffectsHarness.createGraphMessageListener.mock.calls[0]?.[0];
    firstMessageOptions.applyEffects([{ kind: 'fitView' }]);
    expect(firstTooltip.getTooltipData()).toMatchObject({
      info: { path: 'src/tooltip-1.ts' },
    });

    rerender({
      setTooltipData: secondTooltip.setTooltipData,
    } as never);

    expect(eventEffectsHarness.createGraphMessageListener).toHaveBeenCalledTimes(2);
    expect(eventEffectsHarness.createGraphKeyboardListener).toHaveBeenCalledTimes(1);
    expect(removeEventListenerSpy).toHaveBeenCalledWith('message', messageHandlerOne);
    expect(addEventListenerSpy).toHaveBeenCalledWith('message', messageHandlerTwo);

    const secondMessageOptions = eventEffectsHarness.createGraphMessageListener.mock.calls[1]?.[0];
    secondMessageOptions.applyEffects([{ kind: 'fitView' }]);

    expect(firstTooltip.getTooltipData()).toMatchObject({
      info: { path: 'src/tooltip-1.ts' },
    });
    expect(secondTooltip.getTooltipData()).toMatchObject({
      info: { path: 'src/tooltip-2.ts' },
    });

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });
});
