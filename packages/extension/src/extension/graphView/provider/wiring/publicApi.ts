import * as vscode from 'vscode';
import type { EventName, EventPayloads } from '../../../../core/plugins/events/bus';
import type { IGraphData } from '../../../../shared/graph/types';
import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type { GraphViewExternalPluginRegistrationOptions } from '../../webview/plugins/registration';
import { dispatchGraphViewProviderMessage } from '../../webview/providerMessages/dispatch';
import type { GraphViewProviderMethodContainers } from './methodContainers';
import type { GraphViewProviderMessageListenerSource } from '../../webview/providerMessages/listener';
import {
  createGraphViewProviderMethodSource,
  type GraphViewProviderMethodSourceOwner,
} from '../source/create';

interface GraphViewProviderPublicMethodsOwner {
  _methodContainers: Pick<
    GraphViewProviderMethodContainers,
    | 'command'
    | 'fileVisit'
    | 'plugin'
    | 'refresh'
    | 'timeline'
    | 'viewContext'
    | 'viewSelection'
    | 'webview'
  >;
  _extensionMessageEmitter: {
    event(handler: (message: unknown) => void): vscode.Disposable;
  };
}

export interface GraphViewProviderPublicMethods {
  refresh: () => Promise<void>;
  refreshGroupSettings: () => void;
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
  setDepthMode: (depthMode: boolean) => Promise<void>;
  setFocusedFile: (filePath: string | undefined) => void;
  setDepthLimit: (depthLimit: number) => Promise<void>;
  getDepthLimit: () => number;
  openInEditor: () => void;
  sendToWebview: (message: unknown) => void;
  onWebviewMessage: (handler: (message: unknown) => void) => vscode.Disposable;
  dispatchWebviewMessage: (message: WebviewToExtensionMessage) => Promise<void>;
  onExtensionMessage: (handler: (message: unknown) => void) => vscode.Disposable;
}

export type GraphViewProviderPublicMethodsTarget =
  & GraphViewProviderPublicMethods
  & GraphViewProviderPublicMethodsOwner
  & GraphViewProviderMethodSourceOwner
  & GraphViewProviderMessageListenerSource;

export function assignGraphViewProviderPublicMethods(
  target: GraphViewProviderPublicMethodsTarget,
): void {
  target.refresh = () => target._methodContainers.refresh.refresh();
  target.refreshGroupSettings = () => target._methodContainers.refresh.refreshGroupSettings();
  target.refreshPhysicsSettings = () => target._methodContainers.refresh.refreshPhysicsSettings();
  target.refreshSettings = () => target._methodContainers.refresh.refreshSettings();
  target.refreshToggleSettings = () => target._methodContainers.refresh.refreshToggleSettings();
  target.clearCacheAndRefresh = () => target._methodContainers.refresh.clearCacheAndRefresh();
  target.sendCommand = command => target._methodContainers.command.sendCommand(command);
  target.undo = () => target._methodContainers.command.undo();
  target.redo = () => target._methodContainers.command.redo();
  target.canUndo = () => target._methodContainers.command.canUndo();
  target.canRedo = () => target._methodContainers.command.canRedo();
  target.requestExportPng = () => target._methodContainers.command.requestExportPng();
  target.requestExportSvg = () => target._methodContainers.command.requestExportSvg();
  target.requestExportJpeg = () => target._methodContainers.command.requestExportJpeg();
  target.requestExportJson = () => target._methodContainers.command.requestExportJson();
  target.requestExportMarkdown = () => target._methodContainers.command.requestExportMarkdown();
  target.emitEvent = (event, payload) => target._methodContainers.command.emitEvent(event, payload);
  target.resolveWebviewView = (webviewView, context, token) =>
    target._methodContainers.webview.resolveWebviewView(webviewView, context, token);
  target.updateGraphData = data => target._methodContainers.viewContext.updateGraphData(data);
  target.getGraphData = () => target._methodContainers.viewContext.getGraphData();
  target.sendPlaybackSpeed = () => target._methodContainers.timeline.sendPlaybackSpeed();
  target.invalidateTimelineCache = () => target._methodContainers.timeline.invalidateTimelineCache();
  target.trackFileVisit = filePath => target._methodContainers.fileVisit.trackFileVisit(filePath);
  target.registerExternalPlugin = (plugin, options) =>
    target._methodContainers.plugin.registerExternalPlugin(plugin, options);
  target.changeView = viewId => target._methodContainers.viewSelection.changeView(viewId);
  target.setDepthMode = depthMode => target._methodContainers.viewSelection.setDepthMode(depthMode);
  target.setFocusedFile = filePath => target._methodContainers.viewSelection.setFocusedFile(filePath);
  target.setDepthLimit = depthLimit => target._methodContainers.viewSelection.setDepthLimit(depthLimit);
  target.getDepthLimit = () => target._methodContainers.viewSelection.getDepthLimit();
  target.openInEditor = () => target._methodContainers.webview.openInEditor();
  target.sendToWebview = message => target._methodContainers.webview.sendToWebview(message);
  target.onWebviewMessage = handler => target._methodContainers.webview.onWebviewMessage(handler);
  target.dispatchWebviewMessage = message =>
    dispatchGraphViewProviderMessage(message, createGraphViewProviderMethodSource(target));
  target.onExtensionMessage = handler => target._extensionMessageEmitter.event(handler);
}
