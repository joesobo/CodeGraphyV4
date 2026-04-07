import * as vscode from 'vscode';
import type { CodeGraphyWebviewKind } from '../../webview/html';
import type { GraphViewProviderMessageListenerSource } from './defaultDependencies';
import {
  createDefaultGraphViewProviderWebviewMethodDependencies,
  type GraphViewProviderWebviewMethodDependencies,
} from './defaultDependencies';
import { openGraphViewProviderWebviewInEditor } from './editor';
import { sendGraphViewProviderWebviewMessage } from './messages';
import { resolveGraphViewProviderWebviewView } from './resolve';

export interface GraphViewProviderWebviewSource
  extends GraphViewProviderMessageListenerSource {
  _extensionUri: vscode.Uri;
  _view?: vscode.WebviewView;
  _timelineView?: vscode.WebviewView;
  _panels: vscode.WebviewPanel[];
  _notifyExtensionMessage(message: unknown): void;
  _analyzeAndSendData(): Promise<void>;
  _getLocalResourceRoots(): vscode.Uri[];
}

export interface GraphViewProviderWebviewMethods {
  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken,
  ): void;
  openInEditor(): void;
  sendToWebview(message: unknown): void;
  onWebviewMessage(handler: (message: unknown) => void): vscode.Disposable;
  _sendMessage(message: unknown): void;
  _setWebviewMessageListener(webview: vscode.Webview): void;
  _getHtmlForWebview(webview: vscode.Webview): string;
}

export function createGraphViewProviderWebviewMethods(
  source: GraphViewProviderWebviewSource,
  dependencies?: GraphViewProviderWebviewMethodDependencies,
): GraphViewProviderWebviewMethods {
  const resolvedDependencies =
    dependencies ?? createDefaultGraphViewProviderWebviewMethodDependencies();

  const _sendMessage = (message: unknown): void => {
    sendGraphViewProviderWebviewMessage(source, resolvedDependencies, message);
  };

  const _setWebviewMessageListener = (webview: vscode.Webview): void => {
    resolvedDependencies.setWebviewMessageListener(webview, source);
  };

  const _getHtmlForWebview = (
    webview: vscode.Webview,
    viewKind: CodeGraphyWebviewKind = 'graph',
  ): string => resolvedDependencies.createHtml(source._extensionUri, webview, viewKind);

  const resolveWebviewView = (
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void => {
    resolveGraphViewProviderWebviewView(source, resolvedDependencies, webviewView);
  };

  const openInEditor = (): void => {
    openGraphViewProviderWebviewInEditor(source, resolvedDependencies);
  };

  const sendToWebview = (message: unknown): void => {
    _sendMessage(message);
  };

  const onWebviewMessage = (handler: (message: unknown) => void): vscode.Disposable =>
    resolvedDependencies.onWebviewMessage(source._view, handler);

  return {
    resolveWebviewView,
    openInEditor,
    sendToWebview,
    onWebviewMessage,
    _sendMessage,
    _setWebviewMessageListener,
    _getHtmlForWebview,
  };
}
