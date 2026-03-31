import * as vscode from 'vscode';
import { createGraphViewHtml, createGraphViewNonce } from '../../webview/html';
import { openGraphViewInEditor } from '../../editorPanel';
import {
  setGraphViewProviderMessageListener,
  type GraphViewProviderMessageListenerSource,
} from '../../webview/providerMessages/listener';
import { resolveGraphViewWebviewView } from '../../webview/resolve';
import {
  onGraphViewWebviewMessage,
  sendGraphViewWebviewMessage,
} from '../../webview/bridge';

export interface GraphViewProviderWebviewSource
  extends GraphViewProviderMessageListenerSource {
  _extensionUri: vscode.Uri;
  _view?: vscode.WebviewView;
  _panels: vscode.WebviewPanel[];
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

export interface GraphViewProviderWebviewMethodDependencies {
  viewType: string;
  createHtml(extensionUri: vscode.Uri, webview: vscode.Webview): string;
  resolveWebviewView: typeof resolveGraphViewWebviewView;
  openInEditor: typeof openGraphViewInEditor;
  sendWebviewMessage: typeof sendGraphViewWebviewMessage;
  onWebviewMessage: typeof onGraphViewWebviewMessage;
  setWebviewMessageListener: typeof setGraphViewProviderMessageListener;
  executeCommand(command: string, key: string, value: boolean): Thenable<unknown>;
  createPanel: typeof vscode.window.createWebviewPanel;
  log(message: string): void;
}

function createDefaultGraphViewProviderWebviewMethodDependencies(): GraphViewProviderWebviewMethodDependencies {
  return {
    viewType: 'codegraphy.graphView',
    createHtml: (extensionUri, webview) =>
      createGraphViewHtml(extensionUri, webview, createGraphViewNonce()),
    resolveWebviewView: resolveGraphViewWebviewView,
    openInEditor: openGraphViewInEditor,
    sendWebviewMessage: sendGraphViewWebviewMessage,
    onWebviewMessage: onGraphViewWebviewMessage,
    setWebviewMessageListener: setGraphViewProviderMessageListener,
    executeCommand: (command, key, value) => vscode.commands.executeCommand(command, key, value),
    createPanel: (viewType, title, column, options) =>
      vscode.window.createWebviewPanel(viewType, title, column, options),
    log: message => {
      console.log(message);
    },
  };
}

export function createGraphViewProviderWebviewMethods(
  source: GraphViewProviderWebviewSource,
  dependencies?: GraphViewProviderWebviewMethodDependencies,
): GraphViewProviderWebviewMethods {
  const resolvedDependencies =
    dependencies ?? createDefaultGraphViewProviderWebviewMethodDependencies();
  const _sendMessage = (message: unknown): void => {
    resolvedDependencies.sendWebviewMessage(source._view, source._panels, message);
  };

  const _setWebviewMessageListener = (webview: vscode.Webview): void => {
    resolvedDependencies.setWebviewMessageListener(webview, source);
  };

  const _getHtmlForWebview = (webview: vscode.Webview): string =>
    resolvedDependencies.createHtml(source._extensionUri, webview);

  const resolveWebviewView = (
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void => {
    source._view = webviewView;
    resolvedDependencies.resolveWebviewView(webviewView, {
      getLocalResourceRoots: () => source._getLocalResourceRoots(),
      setWebviewMessageListener: nextWebview =>
        _setWebviewMessageListener(nextWebview as vscode.Webview),
      getHtml: nextWebview => _getHtmlForWebview(nextWebview as vscode.Webview),
      executeCommand: (command, key, value) =>
        resolvedDependencies.executeCommand(command, key, value),
      sendAllSettings: () => source._sendAllSettings(),
      analyzeAndSendData: () => source._analyzeAndSendData(),
      log: message => {
        resolvedDependencies.log(message);
      },
    });
  };

  const openInEditor = (): void => {
    resolvedDependencies.openInEditor({
      viewType: resolvedDependencies.viewType,
      extensionUri: source._extensionUri,
      getLocalResourceRoots: () => source._getLocalResourceRoots(),
      createPanel: (viewType, title, column, options) =>
        resolvedDependencies.createPanel(viewType, title, column, options),
      setWebviewMessageListener: webview => _setWebviewMessageListener(webview),
      getHtmlForWebview: webview => _getHtmlForWebview(webview),
      registerPanel: panel => {
        source._panels.push(panel);
      },
      unregisterPanel: panel => {
        source._panels = source._panels.filter(existingPanel => existingPanel !== panel);
      },
    });
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
