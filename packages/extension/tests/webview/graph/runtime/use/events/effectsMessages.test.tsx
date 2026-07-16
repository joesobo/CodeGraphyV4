import { renderHook } from '@testing-library/react';
import type { Dispatch, SetStateAction } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IFileInfo } from '../../../../../../src/shared/files/info';
import type { GraphTooltipState } from '../../../../../../src/webview/components/graph/tooltip/model';
import { useGraphEventEffects } from '../../../../../../src/webview/components/graph/runtime/use/events/effects';
import {
  createData,
  createInteractionHandlers,
  createLink,
  createNode,
  createTooltipSetter,
  type MessageEffectHandlers,
} from './effectsFixture';

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

vi.mock('../../../../../../src/webview/components/graph/effects/keyboard', () => ({
  applyKeyboardEffects: eventEffectsHarness.applyKeyboardEffects,
}));
vi.mock('../../../../../../src/webview/components/graph/effects/messages', () => ({
  applyWebviewMessageEffects: eventEffectsHarness.runWebviewMessageEffects,
}));
vi.mock('../../../../../../src/webview/components/graph/keyboard/listener', () => ({
  createGraphKeyboardListener: eventEffectsHarness.createGraphKeyboardListener,
}));
vi.mock('../../../../../../src/webview/components/graph/messages/listener', () => ({
  createGraphMessageListener: eventEffectsHarness.createGraphMessageListener,
}));
vi.mock('../../../../../../src/webview/export/jpeg', () => ({ exportAsJpeg: eventEffectsHarness.exportAsJpeg }));
vi.mock('../../../../../../src/webview/export/json/export', () => ({ exportAsJson: eventEffectsHarness.exportAsJson }));
vi.mock('../../../../../../src/webview/export/markdown/export', () => ({ exportAsMarkdown: eventEffectsHarness.exportAsMarkdown }));
vi.mock('../../../../../../src/webview/export/png', () => ({ exportAsPng: eventEffectsHarness.exportAsPng }));
vi.mock('../../../../../../src/webview/export/svg/export', () => ({ exportAsSvg: eventEffectsHarness.exportAsSvg }));
vi.mock('../../../../../../src/webview/vscodeApi', () => ({ postMessage: eventEffectsHarness.postMessage }));
vi.mock('../../../../../../src/webview/store/state', () => ({
  graphStore: { getState: () => ({ handleExtensionMessage: eventEffectsHarness.handleExtensionMessage }) },
}));

describe('graph/runtime/useGraphEventEffects message effects', () => {
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
    const directionModeRef = { current: 'incoming' as never };
    const graphAppearanceRef = { current: { linkHighlight: '#60a5fa' } } as never;
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
      directionModeRef,
      graphAppearanceRef,
      fileInfoCacheRef,
      graphDataRef,
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
        updateTooltipInfo: expect.any(Function),
        zoomGraphView: expect.any(Function),
      }),
    );

    const fileInfo = { path: 'src/tooltip.ts' } as IFileInfo;
    capturedHandlers?.fitView();
    capturedHandlers?.zoomGraphView(1.5);
    capturedHandlers?.cacheFileInfo(fileInfo);
    capturedHandlers?.updateTooltipInfo(fileInfo);
    capturedHandlers?.postMessage({ type: 'PING' });
    capturedHandlers?.exportPng();
    capturedHandlers?.exportSvg();
    capturedHandlers?.exportJpeg();
    capturedHandlers?.exportJson();
    capturedHandlers?.exportMarkdown();

    expect(interactionHandlers.fitView).toHaveBeenCalledTimes(1);
    expect(interactionHandlers.zoomGraphView).toHaveBeenCalledWith(1.5);
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

    addEventListenerSpy.mockRestore();
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
    const directionModeRef = { current: 'incoming' as never };
    const graphAppearanceRef = { current: { linkHighlight: '#22c55e' } } as never;
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
        directionModeRef,
        graphAppearanceRef,
        fileInfoCacheRef,
        graphDataRef,
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
