import * as vscode from 'vscode';
import {
  createGraphViewHtml,
  createGraphViewNonce,
  type CodeGraphyWebviewKind,
} from '../../webview/html';
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

export interface GraphViewProviderWebviewMethodDependencies {
  viewType: string;
  createHtml(
    extensionUri: vscode.Uri,
    webview: vscode.Webview,
    viewKind: CodeGraphyWebviewKind,
  ): string;
  resolveWebviewView: typeof resolveGraphViewWebviewView;
  openInEditor: typeof openGraphViewInEditor;
  sendWebviewMessage: typeof sendGraphViewWebviewMessage;
  onWebviewMessage: typeof onGraphViewWebviewMessage;
  setWebviewMessageListener: typeof setGraphViewProviderMessageListener;
  executeCommand(command: string, key: string, value: boolean): Thenable<unknown>;
  createPanel: typeof vscode.window.createWebviewPanel;
}

export function createDefaultGraphViewProviderWebviewMethodDependencies(): GraphViewProviderWebviewMethodDependencies {
  return {
    viewType: 'codegraphy.graphView',
    createHtml: (extensionUri, webview, viewKind) =>
      createGraphViewHtml(extensionUri, webview, createGraphViewNonce(), viewKind),
    resolveWebviewView: resolveGraphViewWebviewView,
    openInEditor: openGraphViewInEditor,
    sendWebviewMessage: sendGraphViewWebviewMessage,
    onWebviewMessage: onGraphViewWebviewMessage,
    setWebviewMessageListener: setGraphViewProviderMessageListener,
    executeCommand: (command, key, value) => vscode.commands.executeCommand(command, key, value),
    createPanel: (viewType, title, column, options) =>
      vscode.window.createWebviewPanel(viewType, title, column, options),
  };
}

export type { GraphViewProviderMessageListenerSource };
