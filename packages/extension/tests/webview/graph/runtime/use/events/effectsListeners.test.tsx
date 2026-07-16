import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IFileInfo } from '../../../../../../src/shared/files/info';
import { useGraphEventEffects } from '../../../../../../src/webview/components/graph/runtime/use/events/effects';
import {
  createData,
  createInteractionHandlers,
  createLink,
  createNode,
  type GraphEventHookProps,
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

describe('graph/runtime/useGraphEventEffects listeners', () => {
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
      ({ interactionHandlers, selectedNodes, tooltipPath }: GraphEventHookProps) => useGraphEventEffects({
        containerRef: { current: document.createElement('div') },
        dataRef: { current: createData('src/one.ts') },
        directionModeRef: { current: 'incoming' as never },
        graphAppearanceRef: { current: { linkHighlight: '#22c55e' } } as never,
        fileInfoCacheRef: { current: new Map<string, IFileInfo>() },
        graphDataRef,
        interactionHandlers,
        selectedNodes,
        setTooltipData: vi.fn(),
        showLabelsRef: { current: true },
        themeRef: { current: 'light' as never },
        tooltipPath,
      }),
      {
        initialProps: {
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

    expect(messageOptions.tooltipPath).toBe('src/two.ts');
    expect(messageOptions.getGraphNodes()).toEqual(graphDataRef.current.nodes);
    expect(keyboardOptions.selectedNodeIds).toEqual(['src/two.ts']);
    expect(keyboardOptions.getAllNodeIds()).toEqual(['src/two.ts']);
    expect(keyboardOptions.runEffects).toBe(eventEffectsHarness.applyKeyboardEffects);

    keyboardOptions.fitView();
    keyboardOptions.setSelection(['src/three.ts']);
    keyboardOptions.openNode('src/four.ts');
    keyboardOptions.zoomGraphView(1.5);
    keyboardOptions.postMessage({ type: 'PING' });
    keyboardOptions.dispatchStoreMessage({ type: 'SET_GRAPH_MODE', payload: '2d' });

    expect(updatedInteractionHandlers.fitView).toHaveBeenCalledTimes(1);
    expect(updatedInteractionHandlers.setSelection).toHaveBeenCalledWith(['src/three.ts']);
    expect(updatedInteractionHandlers.requestNodeOpenById).toHaveBeenCalledWith('src/four.ts');
    expect(updatedInteractionHandlers.zoomGraphView).toHaveBeenCalledWith(1.5);
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

});
