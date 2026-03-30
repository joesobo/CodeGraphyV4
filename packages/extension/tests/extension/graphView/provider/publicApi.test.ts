import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { IGraphData } from '../../../../src/shared/graph/types';
import {
  assignGraphViewProviderPublicMethods,
  type GraphViewProviderPublicMethodsTarget,
} from '../../../../src/extension/graphView/provider/publicApi';

function createTarget() {
  const graphData: IGraphData = {
    nodes: [{ id: 'src/app.ts', label: 'app.ts', color: '#ffffff' }],
    edges: [],
  };
  const disposable = { dispose: vi.fn() };
  const getGraphData = vi.fn(() => graphData);
  const onWebviewMessage = vi.fn(() => disposable as unknown as vscode.Disposable);

  const target = {
    refresh: vi.fn(async () => undefined),
    refreshPhysicsSettings: vi.fn(),
    refreshSettings: vi.fn(),
    refreshToggleSettings: vi.fn(),
    clearCacheAndRefresh: vi.fn(async () => undefined),
    sendCommand: vi.fn(),
    undo: vi.fn(async () => undefined),
    redo: vi.fn(async () => undefined),
    canUndo: vi.fn(() => true),
    canRedo: vi.fn(() => false),
    requestExportPng: vi.fn(),
    requestExportSvg: vi.fn(),
    requestExportJpeg: vi.fn(),
    requestExportJson: vi.fn(),
    requestExportMarkdown: vi.fn(),
    emitEvent: vi.fn(),
    resolveWebviewView: vi.fn(),
    updateGraphData: vi.fn(),
    getGraphData,
    sendPlaybackSpeed: vi.fn(),
    invalidateTimelineCache: vi.fn(async () => undefined),
    trackFileVisit: vi.fn(async () => undefined),
    registerExternalPlugin: vi.fn(),
    changeView: vi.fn(async () => undefined),
    setFocusedFile: vi.fn(),
    setDepthLimit: vi.fn(async () => undefined),
    getDepthLimit: vi.fn(() => 7),
    openInEditor: vi.fn(),
    sendToWebview: vi.fn(),
    onWebviewMessage,
    _refreshMethods: {
      refresh: vi.fn(async () => undefined),
      refreshPhysicsSettings: vi.fn(),
      refreshSettings: vi.fn(),
      refreshToggleSettings: vi.fn(),
      clearCacheAndRefresh: vi.fn(async () => undefined),
    },
    _commandMethods: {
      sendCommand: vi.fn(),
      undo: vi.fn(async () => 'undo'),
      redo: vi.fn(async () => 'redo'),
      canUndo: vi.fn(() => true),
      canRedo: vi.fn(() => false),
      requestExportPng: vi.fn(),
      requestExportSvg: vi.fn(),
      requestExportJpeg: vi.fn(),
      requestExportJson: vi.fn(),
      requestExportMarkdown: vi.fn(),
      emitEvent: vi.fn(),
    },
    _fileVisitMethods: {
      trackFileVisit: vi.fn(async () => undefined),
    },
    _pluginMethods: {
      registerExternalPlugin: vi.fn(),
    },
    _timelineMethods: {
      sendPlaybackSpeed: vi.fn(),
      invalidateTimelineCache: vi.fn(async () => undefined),
    },
    _viewContextMethods: {
      updateGraphData: vi.fn(),
      getGraphData,
    },
    _viewSelectionMethods: {
      changeView: vi.fn(async () => undefined),
      setFocusedFile: vi.fn(),
      setDepthLimit: vi.fn(async () => undefined),
      getDepthLimit: vi.fn(() => 7),
    },
    _webviewMethods: {
      resolveWebviewView: vi.fn(),
      openInEditor: vi.fn(),
      sendToWebview: vi.fn(),
      onWebviewMessage,
    },
  } as unknown as GraphViewProviderPublicMethodsTarget;

  return { target, graphData, disposable, getGraphData, onWebviewMessage };
}

describe('assignGraphViewProviderPublicMethods', () => {
  it('assigns refresh and command delegates to the matching method containers', async () => {
    const { target } = createTarget();

    assignGraphViewProviderPublicMethods(target);

    await target.refresh();
    target.refreshPhysicsSettings();
    target.refreshSettings();
    target.refreshToggleSettings();
    await target.clearCacheAndRefresh();
    target.sendCommand('FIT_VIEW');
    expect(await target.undo()).toBe('undo');
    expect(await target.redo()).toBe('redo');
    expect(target.canUndo()).toBe(true);
    expect(target.canRedo()).toBe(false);
    target.requestExportPng();
    target.requestExportSvg();
    target.requestExportJpeg();
    target.requestExportJson();
    target.requestExportMarkdown();
    target.emitEvent('analysis:completed', {
      graph: { nodes: [], edges: [] },
      duration: 1,
    });

    expect(target._refreshMethods.refresh).toHaveBeenCalledTimes(1);
    expect(target._refreshMethods.refreshPhysicsSettings).toHaveBeenCalledTimes(1);
    expect(target._refreshMethods.refreshSettings).toHaveBeenCalledTimes(1);
    expect(target._refreshMethods.refreshToggleSettings).toHaveBeenCalledTimes(1);
    expect(target._refreshMethods.clearCacheAndRefresh).toHaveBeenCalledTimes(1);
    expect(target._commandMethods.sendCommand).toHaveBeenCalledWith('FIT_VIEW');
    expect(target._commandMethods.undo).toHaveBeenCalledTimes(1);
    expect(target._commandMethods.redo).toHaveBeenCalledTimes(1);
    expect(target._commandMethods.canUndo).toHaveBeenCalledTimes(1);
    expect(target._commandMethods.canRedo).toHaveBeenCalledTimes(1);
    expect(target._commandMethods.requestExportPng).toHaveBeenCalledTimes(1);
    expect(target._commandMethods.requestExportSvg).toHaveBeenCalledTimes(1);
    expect(target._commandMethods.requestExportJpeg).toHaveBeenCalledTimes(1);
    expect(target._commandMethods.requestExportJson).toHaveBeenCalledTimes(1);
    expect(target._commandMethods.requestExportMarkdown).toHaveBeenCalledTimes(1);
    expect(target._commandMethods.emitEvent).toHaveBeenCalledWith(
      'analysis:completed',
      {
        graph: { nodes: [], edges: [] },
        duration: 1,
      },
    );
  });

  it('assigns graph, timeline, plugin, and selection delegates', async () => {
    const { target, graphData: previousGraphData, getGraphData } = createTarget();
    const graphData: IGraphData = {
      nodes: [{ id: 'src/feature.ts', label: 'feature.ts', color: '#123456' }],
      edges: [],
    };

    assignGraphViewProviderPublicMethods(target);

    target.updateGraphData(graphData);
    expect(target.getGraphData()).toBe(previousGraphData);
    target.sendPlaybackSpeed();
    await target.invalidateTimelineCache();
    await target.trackFileVisit('src/feature.ts');
    target.registerExternalPlugin({ id: 'plugin.test' });
    await target.changeView('codegraphy.folder');
    target.setFocusedFile('src/feature.ts');
    await target.setDepthLimit(3);
    expect(target.getDepthLimit()).toBe(7);

    expect(target._viewContextMethods.updateGraphData).toHaveBeenCalledWith(graphData);
    expect(getGraphData).toHaveBeenCalledTimes(1);
    expect(target._timelineMethods.sendPlaybackSpeed).toHaveBeenCalledTimes(1);
    expect(target._timelineMethods.invalidateTimelineCache).toHaveBeenCalledTimes(1);
    expect(target._fileVisitMethods.trackFileVisit).toHaveBeenCalledWith('src/feature.ts');
    expect(target._pluginMethods.registerExternalPlugin).toHaveBeenCalledWith(
      { id: 'plugin.test' },
      undefined,
    );
    expect(target._viewSelectionMethods.changeView).toHaveBeenCalledWith('codegraphy.folder');
    expect(target._viewSelectionMethods.setFocusedFile).toHaveBeenCalledWith('src/feature.ts');
    expect(target._viewSelectionMethods.setDepthLimit).toHaveBeenCalledWith(3);
    expect(target._viewSelectionMethods.getDepthLimit).toHaveBeenCalledTimes(1);
  });

  it('assigns webview delegates', () => {
    const { target, onWebviewMessage } = createTarget();
    const handler = vi.fn();
    const message = { type: 'PING' };
    const webviewView = {} as unknown as vscode.WebviewView;
    const context = {} as unknown as vscode.WebviewViewResolveContext;
    const token = {} as unknown as vscode.CancellationToken;

    assignGraphViewProviderPublicMethods(target);

    target.resolveWebviewView(webviewView, context, token);
    target.openInEditor();
    target.sendToWebview(message);
    const registeredDisposable = target.onWebviewMessage(handler);

    expect(target._webviewMethods.resolveWebviewView).toHaveBeenCalledWith(
      webviewView,
      context,
      token,
    );
    expect(target._webviewMethods.openInEditor).toHaveBeenCalledTimes(1);
    expect(target._webviewMethods.sendToWebview).toHaveBeenCalledWith(message);
    expect(target._webviewMethods.onWebviewMessage).toHaveBeenCalledWith(handler);
    expect(registeredDisposable).toBe(onWebviewMessage.mock.results[0]?.value);
  });
});
