import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { GraphQueryRequest } from '@codegraphy-dev/core';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import {
  assignGraphViewProviderPublicMethods,
  type GraphViewProviderPublicMethodsTarget,
} from '../../../../../src/extension/graphView/provider/wiring/publicApi';

function createTarget() {
  const graphData: IGraphData = {
    nodes: [{ id: 'src/app.ts', label: 'app.ts', color: '#ffffff' }],
    edges: [],
  };
  const disposable = { dispose: vi.fn() };
  const getGraphData = vi.fn(() => graphData);
  const onWebviewMessage = vi.fn(() => disposable as unknown as vscode.Disposable);
  const refreshMethods = {
    refresh: vi.fn(async () => undefined),
    refreshIndex: vi.fn(async () => undefined),
    refreshGitignoreMetadata: vi.fn(async () => undefined),
    refreshChangedFiles: vi.fn(async () => undefined),
    refreshGroupSettings: vi.fn(),
    refreshPhysicsSettings: vi.fn(),
    refreshSettings: vi.fn(),
    refreshToggleSettings: vi.fn(),
    clearCacheAndRefresh: vi.fn(async () => undefined),
  };
  const commandMethods = {
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
  };
  const pluginMethods = {};
  const queryMethods = {
    queryGraph: vi.fn(() => ({
      nodes: [{ path: 'src/app.ts', nodeType: 'file' }],
      page: { offset: 0, limit: 500, returned: 1, total: 1 },
    })),
  };
  const viewContextMethods = {
    updateGraphData: vi.fn(),
    getGraphData,
  };
  const viewSelectionMethods = {
    setFocusedFile: vi.fn(),
    setDepthMode: vi.fn(async () => undefined),
    setDepthLimit: vi.fn(async () => undefined),
    getDepthLimit: vi.fn(() => 7),
  };
  const webviewMethods = {
    resolveWebviewView: vi.fn(),
    openInEditor: vi.fn(),
    sendToWebview: vi.fn(),
    onWebviewMessage,
  };

  const target = {
    refresh: vi.fn(async () => undefined),
    refreshGroupSettings: vi.fn(),
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
    queryGraph: vi.fn(),
    setDepthMode: vi.fn(async () => undefined),
    setFocusedFile: vi.fn(),
    setDepthLimit: vi.fn(async () => undefined),
    getDepthLimit: vi.fn(() => 7),
    openInEditor: vi.fn(),
    sendToWebview: vi.fn(),
    onWebviewMessage,
    _methodContainers: {
      refresh: refreshMethods,
      command: commandMethods,
      plugin: pluginMethods,
      query: queryMethods,
      viewContext: viewContextMethods,
      viewSelection: viewSelectionMethods,
      webview: webviewMethods,
    },
  } as unknown as GraphViewProviderPublicMethodsTarget;

  return { target, graphData, disposable, getGraphData, onWebviewMessage, queryMethods, webviewMethods };
}

describe('assignGraphViewProviderPublicMethods', () => {
  it('assigns refresh and command delegates to the matching method containers', async () => {
    const { target } = createTarget();

    assignGraphViewProviderPublicMethods(target);

    await target.refresh();
    target.refreshGroupSettings();
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

    expect(target._methodContainers.refresh.refresh).toHaveBeenCalledTimes(1);
    expect(target._methodContainers.refresh.refreshGroupSettings).toHaveBeenCalledTimes(1);
    expect(target._methodContainers.refresh.refreshPhysicsSettings).toHaveBeenCalledTimes(1);
    expect(target._methodContainers.refresh.refreshSettings).toHaveBeenCalledTimes(1);
    expect(target._methodContainers.refresh.refreshToggleSettings).toHaveBeenCalledTimes(1);
    expect(target._methodContainers.refresh.clearCacheAndRefresh).toHaveBeenCalledTimes(1);
    expect(target._methodContainers.command.sendCommand).toHaveBeenCalledWith('FIT_VIEW');
    expect(target._methodContainers.command.undo).toHaveBeenCalledTimes(1);
    expect(target._methodContainers.command.redo).toHaveBeenCalledTimes(1);
    expect(target._methodContainers.command.canUndo).toHaveBeenCalledTimes(1);
    expect(target._methodContainers.command.canRedo).toHaveBeenCalledTimes(1);
    expect(target._methodContainers.command.requestExportPng).toHaveBeenCalledTimes(1);
    expect(target._methodContainers.command.requestExportSvg).toHaveBeenCalledTimes(1);
    expect(target._methodContainers.command.requestExportJpeg).toHaveBeenCalledTimes(1);
    expect(target._methodContainers.command.requestExportJson).toHaveBeenCalledTimes(1);
    expect(target._methodContainers.command.requestExportMarkdown).toHaveBeenCalledTimes(1);
    expect(target._methodContainers.command.emitEvent).toHaveBeenCalledWith(
      'analysis:completed',
      {
        graph: { nodes: [], edges: [] },
        duration: 1,
      },
    );
  });

  it('assigns graph, query, and selection delegates', async () => {
    const {
      target,
      graphData: previousGraphData,
      getGraphData,
      queryMethods,
    } = createTarget();
    const graphData: IGraphData = {
      nodes: [{ id: 'src/feature.ts', label: 'feature.ts', color: '#123456' }],
      edges: [],
    };
    const query: GraphQueryRequest = { report: 'nodes', arguments: {} };

    assignGraphViewProviderPublicMethods(target);

    target.updateGraphData(graphData);
    expect(target.getGraphData()).toBe(previousGraphData);
    await target.refreshGitignoreMetadata();
    await target.dispatchWebviewMessage({ type: 'REFRESH_GRAPH' });
    expect(target.queryGraph(query)).toEqual({
      nodes: [{ path: 'src/app.ts', nodeType: 'file' }],
      page: { offset: 0, limit: 500, returned: 1, total: 1 },
    });
    await target.setDepthMode(true);
    target.setFocusedFile('src/feature.ts');
    await target.setDepthLimit(3);
    expect(target.getDepthLimit()).toBe(7);

    expect(target._methodContainers.viewContext.updateGraphData).toHaveBeenCalledWith(graphData);
    expect(getGraphData).toHaveBeenCalledTimes(1);
    expect(target._methodContainers.refresh.refreshGitignoreMetadata).toHaveBeenCalledTimes(1);
    expect(target._methodContainers.refresh.refreshIndex).toHaveBeenCalledTimes(1);
    expect(queryMethods.queryGraph).toHaveBeenCalledWith(query);
    expect(target._methodContainers.viewSelection.setDepthMode).toHaveBeenCalledWith(true);
    expect(target._methodContainers.viewSelection.setFocusedFile).toHaveBeenCalledWith(
      'src/feature.ts',
    );
    expect(target._methodContainers.viewSelection.setDepthLimit).toHaveBeenCalledWith(3);
    expect(target._methodContainers.viewSelection.getDepthLimit).toHaveBeenCalledTimes(1);
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

    expect(target._methodContainers.webview.resolveWebviewView).toHaveBeenCalledWith(
      webviewView,
      context,
      token,
    );
    expect(target._methodContainers.webview.openInEditor).toHaveBeenCalledTimes(1);
    expect(target._methodContainers.webview.sendToWebview).toHaveBeenCalledWith(message);
    expect(target._methodContainers.webview.onWebviewMessage).toHaveBeenCalledWith(handler);
    expect(registeredDisposable).toBe(onWebviewMessage.mock.results[0]?.value);
  });
});
