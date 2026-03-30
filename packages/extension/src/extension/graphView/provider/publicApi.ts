import * as vscode from 'vscode';
import type { EventName, EventPayloads } from '../../../core/plugins/eventBus';
import type { IGraphData } from '../../../shared/graph/types';
import type { GraphViewExternalPluginRegistrationOptions } from '../webview/plugins/registration';
import type { GraphViewProviderMethodSourceOwner } from './source/contracts';

type GraphViewProviderPublicMethodsOwner = Pick<
  GraphViewProviderMethodSourceOwner,
  | '_commandMethods'
  | '_fileVisitMethods'
  | '_pluginMethods'
  | '_refreshMethods'
  | '_timelineMethods'
  | '_viewContextMethods'
  | '_viewSelectionMethods'
  | '_webviewMethods'
>;

export interface GraphViewProviderPublicMethods {
  refresh: () => Promise<void>;
  refreshPhysicsSettings: () => void;
  refreshSettings: () => void;
  refreshToggleSettings: () => void;
  clearCacheAndRefresh: () => Promise<void>;
  sendCommand: (
    command:
      | 'FIT_VIEW'
      | 'ZOOM_IN'
      | 'ZOOM_OUT'
      | 'CYCLE_VIEW'
      | 'CYCLE_LAYOUT'
      | 'TOGGLE_DIMENSION',
  ) => void;
  undo: () => Promise<string | undefined>;
  redo: () => Promise<string | undefined>;
  canUndo: () => boolean;
  canRedo: () => boolean;
  requestExportPng: () => void;
  requestExportSvg: () => void;
  requestExportJpeg: () => void;
  requestExportJson: () => void;
  requestExportMarkdown: () => void;
  emitEvent: <E extends EventName>(event: E, payload: EventPayloads[E]) => void;
  resolveWebviewView: (
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken,
  ) => void;
  updateGraphData: (data: IGraphData) => void;
  getGraphData: () => IGraphData;
  sendPlaybackSpeed: () => void;
  invalidateTimelineCache: () => Promise<void>;
  trackFileVisit: (filePath: string) => Promise<void>;
  registerExternalPlugin: (
    plugin: unknown,
    options?: GraphViewExternalPluginRegistrationOptions,
  ) => void;
  changeView: (viewId: string) => Promise<void>;
  setFocusedFile: (filePath: string | undefined) => void;
  setDepthLimit: (depthLimit: number) => Promise<void>;
  getDepthLimit: () => number;
  openInEditor: () => void;
  sendToWebview: (message: unknown) => void;
  onWebviewMessage: (handler: (message: unknown) => void) => vscode.Disposable;
}

export type GraphViewProviderPublicMethodsTarget =
  & GraphViewProviderPublicMethods
  & GraphViewProviderPublicMethodsOwner;

export function assignGraphViewProviderPublicMethods(
  target: GraphViewProviderPublicMethodsTarget,
): void {
  target.refresh = () => target._refreshMethods.refresh();
  target.refreshPhysicsSettings = () => target._refreshMethods.refreshPhysicsSettings();
  target.refreshSettings = () => target._refreshMethods.refreshSettings();
  target.refreshToggleSettings = () => target._refreshMethods.refreshToggleSettings();
  target.clearCacheAndRefresh = () => target._refreshMethods.clearCacheAndRefresh();
  target.sendCommand = command => target._commandMethods.sendCommand(command);
  target.undo = () => target._commandMethods.undo();
  target.redo = () => target._commandMethods.redo();
  target.canUndo = () => target._commandMethods.canUndo();
  target.canRedo = () => target._commandMethods.canRedo();
  target.requestExportPng = () => target._commandMethods.requestExportPng();
  target.requestExportSvg = () => target._commandMethods.requestExportSvg();
  target.requestExportJpeg = () => target._commandMethods.requestExportJpeg();
  target.requestExportJson = () => target._commandMethods.requestExportJson();
  target.requestExportMarkdown = () => target._commandMethods.requestExportMarkdown();
  target.emitEvent = (event, payload) => target._commandMethods.emitEvent(event, payload);
  target.resolveWebviewView = (webviewView, context, token) =>
    target._webviewMethods.resolveWebviewView(webviewView, context, token);
  target.updateGraphData = data => target._viewContextMethods.updateGraphData(data);
  target.getGraphData = () => target._viewContextMethods.getGraphData();
  target.sendPlaybackSpeed = () => target._timelineMethods.sendPlaybackSpeed();
  target.invalidateTimelineCache = () => target._timelineMethods.invalidateTimelineCache();
  target.trackFileVisit = filePath => target._fileVisitMethods.trackFileVisit(filePath);
  target.registerExternalPlugin = (plugin, options) =>
    target._pluginMethods.registerExternalPlugin(plugin, options);
  target.changeView = viewId => target._viewSelectionMethods.changeView(viewId);
  target.setFocusedFile = filePath => target._viewSelectionMethods.setFocusedFile(filePath);
  target.setDepthLimit = depthLimit => target._viewSelectionMethods.setDepthLimit(depthLimit);
  target.getDepthLimit = () => target._viewSelectionMethods.getDepthLimit();
  target.openInEditor = () => target._webviewMethods.openInEditor();
  target.sendToWebview = message => target._webviewMethods.sendToWebview(message);
  target.onWebviewMessage = handler => target._webviewMethods.onWebviewMessage(handler);
}
